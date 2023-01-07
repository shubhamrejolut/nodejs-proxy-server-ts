import mongoose from 'mongoose'

import { Domain } from "./domain.model"
import http from 'http'
import httpProxy from 'http-proxy'

import url from 'url'
import { PROXY_HOST } from './constants'
import { rewriteUrls } from './lib/rewriters'
import { v4 } from 'uuid'
import { getProxiedUrl, getRealUrl, getHostForSubdomain } from "./hostFns"


const baseHost = PROXY_HOST
// Create a proxy server with custom application logic
//


//
// Create your custom server and just call `proxy.web()` to proxy
// a web request to the target passed in the options
// also you can use `proxy.ws()` to proxy a websockets request
//

async function start() {
    const uri = 'mongodb+srv://queueproxysite:NYZcfTzZGSYdPTLu@cluster0.t7syore.mongodb.net/test?maxPoolSize=10';
    await mongoose.connect(uri)
        .then(() => {
            console.log('Successfully connected to MongoDB');
        })
        .catch((error) => {
            console.log(`Error connecting to MongoDB: ${error}`);
            process.exit(101)
        });

    var server = http.createServer(async function (req, res) {
        var proxy = httpProxy.createProxyServer({ changeOrigin: true, selfHandleResponse: true });
        const queryObject = url.parse(req.url!, true).query
        const subdomain = req.headers.host?.replace(baseHost, "").replace(/\.+$/, "")
        if (subdomain === "" || !subdomain && queryObject.url) {
            
            if(!queryObject.url){
                res.writeHead(400, { "content-type": "application/json" })
                return res.end(JSON.stringify({error: "No url was passed"}))
            }
            if(Array.isArray(queryObject.url)){
                res.writeHead(400, { "content-type": "application/json" })
                return res.end(JSON.stringify({ error: "Pass a single url" }))
            }
            res.writeHead(200, { "content-type": "application/json" })
            return res.end(JSON.stringify({ url: queryObject.url, proxy_url: await getProxiedUrl(queryObject.url) }))
            
        }

        // You can define here your custom logic to handle the 
        //request
        // and then proxy the request.
        const requestId = v4()
        //console.log({ url: `${req.headers.host}${req.url}`, message: "Started Processing url", requestId })
        try {
            const target = await getHostForSubdomain(`${req.headers.host?.split(".")[0]}`)

            req.headers['accept-encoding'] = 'identity'
            if (req.headers.origin && req.headers.origin !== "") {

                req.headers.origin = await getRealUrl(req.headers.origin)
            }

            if (req.headers.referrer && req.headers.referrer !== "") {
                const referrer = Array.isArray(req.headers.referrer) ? req.headers.referrer[0] : req.headers.referrer
                req.headers.referrer = await getRealUrl(referrer)
            }
            if (req.headers.host && req.headers.host !== "") {
                req.headers.host = await getRealUrl(req.headers.host)
            }


            const { "x-forwarded-for": xf, "x-forwarded-proto": xp, ...rest } = req.headers
            req.headers = rest


            proxy.web(req, res, { target });

            const body: any[] = []
            proxy.on("proxyRes", async (proxyRes, req, res) => {





                proxyRes.on("data", function (chunk) {
                    body.push(chunk)

                })



                proxyRes.on("end", async function () {


                    const location = Array.isArray(proxyRes.headers.location) ? proxyRes.headers.location[0] : proxyRes.headers.location


                    if (location?.startsWith("ht")) {
                        //res.setHeader("location",getProxiedUrl(location) )
                        proxyRes.headers["location"] = await getProxiedUrl(location)
                    }

                    const { 'content-length': cl, 'Access-Control-Allow-Origin':aco, ...headers } = proxyRes.headers

                    headers["cache-control"] = "no-cache, no-store, must-revalidate"
                    headers["pragma"] = "no-cache"
                    headers['expires']= '0'
                    headers['real-url']= `${target}${req.url}`
                  
                    headers['Access-Control-Allow-Origin']= req.headers.origin && req.headers.origin!=="" ?  (await getProxiedUrl(req.headers.origin)).replace(/\/$/,"") : "*"
                    //This should be origin
                    headers['Access-Control-Allow-Methods']= "GET,POST,PUT,DELETE,HEAD"
                   

                    res.writeHead(proxyRes.statusCode || 200, proxyRes.statusMessage, headers)

                    if (proxyRes.headers!['content-type']?.startsWith("text") || proxyRes.headers!['content-type']?.startsWith("application/json")) {
                        const replacedBody = await rewriteUrls(Buffer.concat(body).toString())
                        res.end(replacedBody)
                    }
                    else
                        res.end(Buffer.concat(body))
                })

            })
            proxy.on("error", (error) => {
               // console.log({ url: `${req.headers.host}${req.url}`, message: `Proxy Error ${error.message} `, requestId })

            })
        } catch (ex: any) {
            console.log({ url: `${req.headers.host}${req.url}`, message: `Caught Error ${ex.message} `, requestId })
            console.error(ex)
            res.end("ERROR")
            // res.write("Subdomain not found")
            // res.end()
        }
    });

    console.log("listening on port 5050")
    server.listen(5050);

}
start()
