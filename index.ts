import mongoose from 'mongoose'

import {Domain} from "./domain.model"
import http from 'http'
import httpProxy from 'http-proxy'

import url from 'url'
import { PROXY_HOST } from './constants'
import { rewriteUrls } from './lib/rewriters'
    //
  const {getProxiedUrl,  getRealUrl, getHostForSubdomain} = require("./hostFns")

    const baseHost = PROXY_HOST
// Create a proxy server with custom application logic
//


//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//

async function start(){
  const uri = 'mongodb+srv://queueproxysite:NYZcfTzZGSYdPTLu@cluster0.t7syore.mongodb.net/test';
  await mongoose.connect(uri)
  .then(() => {
    console.log('Successfully connected to MongoDB');
  })
  .catch((error) => {
    console.log(`Error connecting to MongoDB: ${error}`);
    process.exit(101)
  });
  
  var server = http.createServer(async function(req, res) {
    var proxy = httpProxy.createProxyServer({  changeOrigin: true, selfHandleResponse: true});
    const queryObject = url.parse(req.url!, true).query
    const subdomain = req.headers.host?.replace(baseHost, "").replace(/\.+$/,"")
    if(subdomain==="" || !subdomain && queryObject.url){
      res.writeHead(200, {"content-type": "application/json"})
      res.end(JSON.stringify({url: queryObject.url, proxy_url: await getProxiedUrl(queryObject.url) }))
      return 
    }
   
    // You can define here your custom logic to handle the 
    //request
    // and then proxy the request.
    console.log(`URL: ://${req.headers.host}`)
try{    const target = await getHostForSubdomain(`${req.headers.host?.split(".")[0]}`)

req.headers['accept-encoding']= 'identity'
if(req.headers.origin && req.headers.origin!=="")
  req.headers.origin= await getRealUrl(req.headers.origin)
if(req.headers.referrer && req.headers.referrer!=="")

  req.headers.referrer= await getRealUrl(req.headers.referrer)
  req.headers.host= "rollbar.com"

  const {"x-forwarded-for":xf, "x-forwarded-proto":xp, ...rest} = req.headers
  req.headers = rest


    proxy.web(req, res, { target});
    
    const body: any[] = []
    proxy.on("proxyRes", async (proxyRes, req,res)=>{
    
     
      if(proxyRes.headers!['content-type']?.startsWith("text") || proxyRes.headers!['content-type']?.startsWith("application/javascript") || proxyRes.headers!['content-type']?.startsWith("application/json")){

      
        proxyRes.on("data", function(chunk){
          body.push(chunk)

        })
 
      }
     
      proxyRes.on("end", async function(){
 
        console.log("RESPONSE BODY  RECEIVED:========\n", Buffer.concat(body).toString())
        const location =  Array.isArray(proxyRes.headers.location ) ? proxyRes.headers.location[0]: proxyRes.headers.location
       
    
        if( location?.startsWith("ht"))
        {
          //res.setHeader("location",getProxiedUrl(location) )
          proxyRes.headers["location"] = await getProxiedUrl(location)
        }
        const {'content-length': cl, ...headers} = proxyRes.headers
        res.writeHead(proxyRes.statusCode || 200, proxyRes.statusMessage, headers)

        
        const replacedBody=  await rewriteUrls(Buffer.concat(body).toString())
        console.log("REPLACED BODY : =====\n", replacedBody)
    
        res.end(replacedBody)
        })

    })
    proxy.on("error", (error)=>{
      console.log("Error", error)
    })
  }catch(ex: any){
    console.log("error happend")
    console.log(ex.message)
   // res.write("Subdomain not found")
   // res.end()
  }
  });
  
  console.log("listening on port 5050")
  server.listen(5050);
  
}
start()
