import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { signup, login, getMe, logout, getStores } from '../api';
beforeEach(()=>{localStorage.clear();vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>vi.unstubAllGlobals());
const response = (status,body) => ({ok:status<400,status,json:async()=>body});
it('signup sends address and never forwards privileged role',async()=>{
 fetch.mockResolvedValue(response(201,{user:{role:'user'}}));await signup({name:'Registered Normal User Person',email:'x@y.com',password:'Testing!123',address:'Street',role:'admin'});
 const sent=JSON.parse(fetch.mock.calls[0][1].body);expect(sent.address).toBe('Street');expect(sent.role).toBeUndefined();
});
it('login stores verified identity and sends no selected role',async()=>{
 fetch.mockResolvedValue(response(200,{user:{id:1,role:'owner'},token:'verified'}));await login({email:'x@y.com',password:'Testing!123',role:'admin'});expect(JSON.parse(fetch.mock.calls[0][1].body).role).toBeUndefined();expect(localStorage.getItem('token')).toBe('verified');expect(JSON.parse(localStorage.getItem('user')).role).toBe('owner');
});
it('401 clears session and emits expiration event',async()=>{
 localStorage.setItem('token','expired');const listener=vi.fn();window.addEventListener('session-expired',listener);fetch.mockResolvedValue(response(401,{message:'expired'}));await expect(getMe()).rejects.toThrow('expired');expect(localStorage.getItem('token')).toBeNull();expect(listener).toHaveBeenCalled();window.removeEventListener('session-expired',listener);
});
it('logout clears session even after network failure',async()=>{
 localStorage.setItem('token','token');fetch.mockRejectedValue(new Error('offline'));await expect(logout()).rejects.toThrow('offline');expect(localStorage.getItem('token')).toBeNull();
});
it('normalizes numeric rating fields from MySQL responses',async()=>{
 fetch.mockResolvedValue(response(200,[{avgRating:'3.5',ratingsCount:2,userRating:'4.0'}]));expect((await getStores())[0]).toMatchObject({avgRating:3.5,ratingsCount:2,userRating:4});
});
