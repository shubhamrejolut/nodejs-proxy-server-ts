import * as dotenv from "dotenv";
dotenv.config();

export const PROXY_HOST = process.env.PROXY_HOST;
export const PORT = process.env.PORT;

export const URL_REGEX =
  /(http(s)?:)\/\/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
export const MONGODB_URI = process.env.MONGODB_URI;
export const ROLLBAR_TOKEN = process.env.ROLLBAR_TOKEN;
export const INJECT_SCRIPT_OLD = `

window._window= window;




function $PastelGetVariable(name) {
    const root = typeof window === 'undefined' ? self : window;
    if (name === 'document') {
        return root._window && root._window['document'] || (typeof document !== 'undefined' ? document : undefined);
    } else if (name === 'location') {
        return root._window && root._window['location'] || (typeof location !== 'undefined' ? location : undefined);
    } else if (name === 'top') {
        if (typeof window !== 'undefined' ) {
            return window._window;
        }
        
        return root._window && root._window['top'] || (typeof top !== 'undefined' ? top : undefined);
    } else if (name === 'parent') {
        if (typeof window !== 'undefined' ) {
            return window._window;
        }
        
        return root._window && root._window['parent'] || (typeof parent !== 'undefined' ? parent : undefined);
    } else if (name === 'frames') {
        return root._window || (typeof frames !== 'undefined' ? frames : undefined);
    } else if (name === 'opener') {
        return root._window && root._window['opener'] || (typeof opener !== 'undefined' ? opener : undefined);
    } else if (name === 'self') {
        return root._window || (typeof self !== 'undefined' ? self : undefined);
    } else if (name === 'window') {
        return root._window || (typeof window !== 'undefined' ? window : undefined);
    } else if (name === 'globalThis') {
        return root._window || (typeof globalThis !== 'undefined' ? globalThis : undefined);
    } else {
        return root[name];
    }
}

{
    let document = $PastelGetVariable('document');
    let location = $PastelGetVariable('location');
    let top = $PastelGetVariable('top');
    let parent = $PastelGetVariable('parent');
    let frames = $PastelGetVariable('frames');
    let opener = $PastelGetVariable('opener');
    let self = $PastelGetVariable('self');
    let window = $PastelGetVariable('window');
    let globalThis = $PastelGetVariable('globalThis');
`;

export const INJECT_SCRIPT = `
{
   
    let location = window.location;
    let top = window;
   
   
`;
