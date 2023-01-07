import { URL_REGEX } from "../constants";
import { getProxiedUrl } from "../hostFns";
import mongoose from "mongoose"
export async function  rewriteUrls(body:string){
   

  

    let output= body

    for( const url of body.match(URL_REGEX) || []){
        output= output.replace(url, await getProxiedUrl(url))
    }
    
        return output
}
