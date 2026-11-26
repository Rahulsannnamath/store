import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import AuthDialog from '../components/AuthDialog';
import PasswordDialog from '../components/PasswordDialog';
import StoreList from '../components/StoreList';
import AdminDashboard from '../components/AdminDashboard';
import OwnerDashboard from '../components/OwnerDashboard';
import App from '../App';
import { sortedRows, userError } from '../validation';
import * as api from '../api';
vi.mock('../api', () => ({ login:vi.fn(),signup:vi.fn(),logout:vi.fn(),getMe:vi.fn(),clearSession:vi.fn(),changePassword:vi.fn(),getStores:vi.fn(),submitRating:vi.fn(),updateRating:vi.fn(),adminGetStats:vi.fn(),adminListUsers:vi.fn(),adminListStores:vi.fn(),adminCreateUser:vi.fn(),adminCreateStore:vi.fn(),adminGetUser:vi.fn(),getOwnerStores:vi.fn(),getStoreRaters:vi.fn() }));
const stores = [{id:1,name:'Alpha Market',address:'First Street',avgRating:4,ratingsCount:2,userRating:0},{id:2,name:'Zeta Market',address:'Second Street',avgRating:2,ratingsCount:1,userRating:0}];
beforeEach(() => {
 vi.resetAllMocks(); localStorage.clear();
 api.getStores.mockResolvedValue(stores);api.getOwnerStores.mockResolvedValue([]);api.getStoreRaters.mockResolvedValue([]);
 api.adminGetStats.mockResolvedValue({totalUsers:3,totalStores:2,totalRatings:3});api.adminListUsers.mockResolvedValue([{id:3,name:'Normal Registered Test Person',email:'person@example.com',address:'Test Street',role:'user'}]);api.adminListStores.mockResolvedValue(stores);
});
afterEach(cleanup);
const fill = (label,value) => fireEvent.change(screen.getAllByLabelText(label)[0],{target:{value}});
describe('authentication UI',()=>{
 it('signup requires a 20-character name, address and strong password',()=>{
  render(<AuthDialog open mode="signup" onClose={()=>{}} onSubmit={vi.fn()} />);
  fill('Name','Short');fill('Email','user@example.com');fill('Password','Testing!123');fill('Address','Testing Street');
  expect(screen.getByRole('button',{name:'Create account'})).toBeDisabled();
  fill('Name','Normal Registered Test Person');expect(screen.getByRole('button',{name:'Create account'})).toBeEnabled();
  fill('Address','x'.repeat(401));expect(screen.getByRole('button',{name:'Create account'})).toBeDisabled();
  expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();
 });
 it('signup submits address and no privileged role',async()=>{
  const submit=vi.fn().mockResolvedValue({});render(<AuthDialog open mode="signup" onClose={()=>{}} onSubmit={submit}/>);
  fill('Name','Normal Registered Test Person');fill('Email','user@example.com');fill('Password','Testing!123');fill('Address','Testing Street');
  fireEvent.click(screen.getByRole('button',{name:'Create account'}));await waitFor(()=>expect(submit).toHaveBeenCalledWith({name:'Normal Registered Test Person',email:'user@example.com',password:'Testing!123',address:'Testing Street'}));
 });
 it('login accepts existing passwords without applying signup complexity',async()=>{
  const submit=vi.fn().mockResolvedValue({});render(<AuthDialog open onClose={()=>{}} onSubmit={submit}/>);fill('Email','user@example.com');fill('Password','legacy');fireEvent.click(screen.getByRole('button',{name:'Log in'}));await waitFor(()=>expect(submit).toHaveBeenCalled());
 });
 it('shows login API failure',async()=>{
  render(<AuthDialog open onClose={()=>{}} onSubmit={vi.fn().mockRejectedValue(new Error('Invalid credentials'))}/>);fill('Email','user@example.com');fill('Password','bad');fireEvent.click(screen.getByRole('button',{name:'Log in'}));expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
 });
 it('App completes login and renders admin dashboard',async()=>{
  api.login.mockResolvedValue({user:{id:1,name:'Admin',role:'admin'}});render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Log in'}));fill('Email','admin@example.com');fill('Password','Testing!123');fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Log in'}));expect(await screen.findByText('StoreConnect - Admin Panel')).toBeInTheDocument();
 });
 for (const [button, title, role, dashboard] of [
  ['Login as Store Owner','Store Owner login','owner','Store Owner Dashboard'],
  ['Login as Admin','Admin login','admin','StoreConnect - Admin Panel']
 ]) it(`${button} opens a labeled login and uses the verified role`,async()=>{
  api.login.mockResolvedValue({user:{id:1,name:'Test Account',role}});
  render(<App/>);fireEvent.click(screen.getByRole('button',{name:button}));
  expect(screen.getByRole('dialog',{name:title})).toBeInTheDocument();
  fill('Email','account@example.com');fill('Password','Testing!123');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Log in'}));
  expect(await screen.findByText(dashboard)).toBeInTheDocument();
  expect(api.login).toHaveBeenCalledWith({email:'account@example.com',password:'Testing!123'});
 });
 for(const [role,label] of [['admin','StoreConnect - Admin Panel'],['owner','Store Owner Dashboard'],['user','Explore Stores']]) it(`restores ${role} dashboard from verified session`,async()=>{
  localStorage.setItem('token',`x.${btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))}.x`);api.getMe.mockResolvedValue({user:{id:9,name:'Test User',role}});render(<App/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Log out'})).toBeInTheDocument());await waitFor(()=>expect(screen.getByText(label)).toBeVisible());await waitFor(()=>expect(api.getMe).toHaveBeenCalled());
 });
 it('password change submits both passwords and clears session',async()=>{
  api.changePassword.mockResolvedValue({message:'Success'});render(<PasswordDialog open onClose={()=>{}}/>);fill(/Current password/,'Testing!123');fill(/New password/,'Updated!123');fireEvent.click(screen.getByRole('button',{name:'Save password'}));await waitFor(()=>expect(api.changePassword).toHaveBeenCalledWith({currentPassword:'Testing!123',newPassword:'Updated!123'}));await waitFor(()=>expect(api.clearSession).toHaveBeenCalled());
 });
 it('password change shows incorrect-current-password failure',async()=>{
  api.changePassword.mockRejectedValue(new Error('Current password is incorrect'));render(<PasswordDialog open onClose={()=>{}}/>);fill(/Current password/,'wrong');fill(/New password/,'Updated!123');fireEvent.click(screen.getByRole('button',{name:'Save password'}));expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
 });
});
describe('store ratings',()=>{
 it('submits a new rating and refreshes the displayed count',async()=>{
  api.getStores.mockResolvedValue([stores[0]]);api.submitRating.mockResolvedValue({userRating:4,avgRating:4,ratingsCount:3});render(<StoreList canRate/>);await screen.findByText('Alpha Market');fireEvent.click(screen.getByLabelText('4 Stars'));fireEvent.click(screen.getByRole('button',{name:'Submit Rating'}));await waitFor(()=>expect(api.submitRating).toHaveBeenCalledWith(1,4));expect(await screen.findByText('(3 ratings)')).toBeInTheDocument();expect(screen.getByText('Rating saved')).toBeInTheDocument();
 });
 it('modifies existing rating using PUT API',async()=>{
  api.getStores.mockResolvedValue([{...stores[0],userRating:2}]);api.updateRating.mockResolvedValue({userRating:5,avgRating:4,ratingsCount:2});render(<StoreList canRate/>);fireEvent.click(await screen.findByRole('button',{name:'Edit Rating'}));fireEvent.click(screen.getByLabelText('5 Stars'));fireEvent.click(screen.getByRole('button',{name:'Save Rating'}));await waitFor(()=>expect(api.updateRating).toHaveBeenCalledWith(1,5));
 });
 it('guests cannot submit ratings',async()=>{render(<StoreList/>);await screen.findByText('Alpha Market');expect(screen.getAllByRole('button',{name:'Submit Rating'}).every(b=>b.disabled)).toBe(true);});
 it('shows store API failure',async()=>{api.getStores.mockRejectedValue(new Error('Database unavailable'));render(<StoreList/>);expect(await screen.findByText('Database unavailable')).toBeInTheDocument();});
 it('shows empty search state',async()=>{api.getStores.mockResolvedValue([]);render(<StoreList/>);expect(await screen.findByText('No stores found.')).toBeInTheDocument();});
 it('sorts store cards in descending numeric rating order',async()=>{
  render(<StoreList/>);await screen.findByText('Alpha Market');fireEvent.mouseDown(screen.getByRole('combobox'));fireEvent.click(screen.getByRole('option',{name:'Rating descending'}));const names=screen.getAllByRole('heading',{level:6});expect(names.map(n=>n.textContent)).toEqual(['Alpha Market','Zeta Market']);
 });
});
describe('admin and owner dashboards',()=>{
 it('admin sorts both ways and opens user details',async()=>{
  api.adminListUsers.mockResolvedValue([{id:1,name:'Zeta User With Long Name',email:'z@example.com',address:'Z Street',role:'owner'},{id:2,name:'Alpha User With Long Name',email:'a@example.com',address:'A Street',role:'user'}]);
  api.adminGetUser.mockResolvedValue({id:1,name:'Zeta User With Long Name',email:'z@example.com',address:'Z Street',role:'owner',stores:[{id:1,name:'Owner Shop',avgRating:4,ratingsCount:3}]});render(<AdminDashboard/>);await screen.findByText('Zeta User With Long Name');
  const table=screen.getAllByRole('table')[0];expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Alpha User');fireEvent.click(within(table).getByText('NAME'));expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Zeta User');fireEvent.click(within(table).getAllByRole('button',{name:'View details'})[0]);expect(await screen.findByText('Owner Shop: 4.0/5 (3 ratings)')).toBeInTheDocument();
 });
 it('admin preserves filter while refreshing after creation',async()=>{
  api.adminCreateUser.mockResolvedValue({});render(<AdminDashboard/>);await screen.findByText('Normal Registered Test Person');fireEvent.change(screen.getByPlaceholderText('Filter by Name, Email, Address, Role'),{target:{value:'Test'}});fill('Name','Another Registered Test Person');fill('Email','new@example.com');fill('Password','Testing!123');fill('Address','Testing Street');fireEvent.click(screen.getByRole('button',{name:'Add User'}));await waitFor(()=>expect(api.adminCreateUser).toHaveBeenCalled());await waitFor(()=>expect(api.adminListUsers).toHaveBeenLastCalledWith({q:'Test',role:'all'}));
 });
 it('owner calculates weighted average and shows raters',async()=>{
  api.getOwnerStores.mockResolvedValue([{...stores[0],ratingsCount:10,avgRating:5,ratingSum:50},{...stores[1],ratingsCount:1,avgRating:1,ratingSum:1}]);api.getStoreRaters.mockResolvedValue([{id:1,name:'A Rating Person',rating:5,created_at:'2026-01-01'}]);render(<OwnerDashboard user={{name:'Owner'}}/>);expect(await screen.findByText('4.6')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'View ratings for Alpha Market'}));expect(await screen.findByText('A Rating Person')).toBeInTheDocument();
 });
 it('owner with no stores has an empty state',async()=>{render(<OwnerDashboard/>);expect(await screen.findByText('No stores assigned yet.')).toBeInTheDocument();});
});
describe('validation and ordering',()=>{
 it('sorts numbers numerically in both directions',()=>{const rows=[{avgRating:'2'},{avgRating:'10'},{avgRating:'4'}];expect(sortedRows(rows,{key:'avgRating',direction:'asc'}).map(r=>r.avgRating)).toEqual(['2','4','10']);expect(sortedRows(rows,{key:'avgRating',direction:'desc'}).map(r=>r.avgRating)).toEqual(['10','4','2']);});
 it('enforces matching signup validation boundaries',()=>{const valid={name:'a'.repeat(20),email:'x@y.com',address:'a'.repeat(400),password:'Testing!123'};expect(userError(valid)).toBe('');for(const override of [{name:'a'.repeat(19)},{name:'a'.repeat(61)},{email:'bad'},{address:'a'.repeat(401)},{password:'lowercase!'}])expect(userError({...valid,...override})).not.toBe('');});
});
