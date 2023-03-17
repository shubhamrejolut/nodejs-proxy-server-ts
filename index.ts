import mongoose from "mongoose";

import { Domain } from "./domain.model";
import http from "http";
import httpProxy from "http-proxy";

import Rollbar from "rollbar";
import url from "url";
import { MONGODB_URI, PROXY_HOST, ROLLBAR_TOKEN } from "./constants";
import { injectScript, rewriteUrls } from "./lib/rewriters";
import { v4 } from "uuid";
import {
  getProxiedUrl,
  getRealUrl,
  getHostForSubdomain,
  getHostNameForSubdomain,
} from "./hostFns";
import zlib from "zlib";
import * as cheerio from "cheerio";
const baseHost = PROXY_HOST;
const uri = MONGODB_URI;
const rollbar = new Rollbar({
  accessToken: ROLLBAR_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    code_version: "1.0.0",
  },
});

async function start() {
  if (!uri) {
    throw new Error("MongoDB Url not specified");
  }
  if (!baseHost) {
    throw new Error("Proxy host ENV variable not specified");
  }

  await mongoose
    .connect(uri)
    .then(() => {
      console.log("Successfully connected to MongoDB");
    })
    .catch((error) => {
      rollbar.error(error);
      console.log(`Error connecting to MongoDB: ${error}`);
      process.exit(101);
    });

  var server = http.createServer(async function (req, res) {
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");

    var proxy = httpProxy.createProxyServer({
      changeOrigin: true,
      selfHandleResponse: true,
    });

    const queryObject = url.parse(req.url!, true).query;
    const subdomain = req.headers.host
      ?.replace(baseHost, "")
      .replace(/\.+$/, "");

    if (queryObject.url) {
      if (!queryObject.url) {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: "No url was passed" }));
      }

      if (Array.isArray(queryObject.url)) {
        res.writeHead(400, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: "Pass a single url" }));
      }

      res.writeHead(200, { "content-type": "application/json" });
      return res.end(
        JSON.stringify({
          url: queryObject.url,
          proxy_url: await getProxiedUrl(queryObject.url, true),
        })
      );
    }

    // You can define here your custom logic to handle the
    //request
    // and then proxy the request.
    const requestId = v4();
    //console.log({ url: `${req.headers.host}${req.url}`, message: "Started Processing url", requestId })
    try {
      const target = await getHostForSubdomain(
        `${req.headers.host?.split(".")[0]}`
      );

      req.headers["accept-encoding"] = "identity";
      if (req.headers.origin && req.headers.origin !== "") {
        req.headers.origin = await getRealUrl(req.headers.origin);
      }

      if (req.headers.referrer && req.headers.referrer !== "") {
        const referrer = Array.isArray(req.headers.referrer)
          ? req.headers.referrer[0]
          : req.headers.referrer;
        req.headers.referrer = await getRealUrl(referrer);
      }
      if (req.headers.host && req.headers.host !== "") {
        req.headers.host = await getHostNameForSubdomain(
          `${req.headers.host?.split(".")[0]}`
        );
      }

      const {
        "x-forwarded-for": xf,
        "x-forwarded-proto": xp,
        ...rest
      } = req.headers;
      req.headers = rest;

      proxy.web(req, res, { target });

      const body: any[] = [];
      proxy.on("proxyRes", async (proxyRes, req, res) => {
        proxyRes.on("data", function (chunk) {
          body.push(chunk);
        });

        proxyRes.on("end", async function () {
          const location = Array.isArray(proxyRes.headers.location)
            ? proxyRes.headers.location[0]
            : proxyRes.headers.location;

          if (location?.startsWith("ht")) {
            //res.setHeader("location",getProxiedUrl(location) )
            proxyRes.headers["location"] = await getProxiedUrl(location);
          }
          // console.log("zlib dec", zlib.gunzipSync(Buffer.concat(body)).toString())

          const {
            "content-length": cl,
            "access-control-allow-origin": aco,
            "content-security-policy": csp,
            "x-frame-options": xf,
            ...headers
          } = Object.fromEntries(
            Object.entries(proxyRes.headers).map(([key, value]) => [
              key.toLowerCase(),
              value,
            ])
          );

          headers["cache-control"] = "no-cache, no-store, must-revalidate";
          headers["pragma"] = "no-cache";
          headers["expires"] = "0";
          headers["real-url"] = `${target}${req.url}`;

          headers["access-control-allow-origin"] =
            req.headers.origin && req.headers.origin !== ""
              ? (await getProxiedUrl(req.headers.origin)).replace(/\/$/, "")
              : "*";
          //This should be origin
          headers["access-control-allow-methods"] = "GET,POST,PUT,DELETE,HEAD";

          res.writeHead(
            proxyRes.statusCode || 200,
            proxyRes.statusMessage,
            headers
          );
          const isGzip = proxyRes.headers["content-encoding"] === "gzip";

          if (
            proxyRes.headers!["content-type"]?.startsWith("text") ||
            proxyRes.headers!["content-type"]?.startsWith("application/json")
          ) {
            const textBody = (
              isGzip
                ? zlib.gunzipSync(Buffer.concat(body))
                : Buffer.concat(body)
            ).toString();
            let replacedBody = await rewriteUrls(textBody);

            if (proxyRes.headers!["content-type"].startsWith("text/html")) {
              const $ = cheerio.load(replacedBody);
              if ($("script").length > 0) {
                $("script").map(function () {
                  const $this = $(this);
                  const scriptType = $(this).attr("type");
                  if (
                    scriptType === "text/javascript" ||
                    scriptType == "" ||
                    !scriptType ||
                    scriptType == "javascript"
                  ) {
                    const script = $(this).html();
                    $(this).html(injectScript(script));
                  }
                });
                replacedBody = $.root().html()!;
              }
              replacedBody +=
                "<script type='text/javascript' src='https://cdn.jsdelivr.net/gh/masudhossain/proxy-js@main/proxy6.js'></script>";
              replacedBody +=
                "<link rel='stylesheet' href='https://cdn.jsdelivr.net/gh/masudhossain/proxy-js@main/style2.css'></link>";
            }
            res.end(isGzip ? zlib.gzipSync(replacedBody) : replacedBody);
          } else res.end(Buffer.concat(body));
        });
      });
      proxy.on("error", (error) => {
        rollbar.error(error, req, {
          requestedUrl: `${req.headers.host}${req.url}`,
        });

        console.log({
          url: `${req.headers.host}${req.url}`,
          message: `Proxy Error ${error.message} `,
          requestId,
        });
        res.end("Error Loading the page");
      });
    } catch (ex: any) {
      console.log({
        url: `${req.headers.host}${req.url}`,
        message: `Caught Error ${ex.message} `,
        requestId,
      });
      console.error(ex);
      rollbar.error(ex, req, { requestedUrl: `${req.headers.host}${req.url}` });
      res.end("An error happened while loading the page");
    }
  });
  const port = process.env.PORT || "5050";
  console.log(`listening on port ${port}`);
  server.listen(parseInt(port));
}
start();
