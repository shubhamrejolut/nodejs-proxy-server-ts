import { URL_REGEX } from "../constants";
import { getProxiedUrl } from "../hostFns";
import mongoose from "mongoose"
import fs from 'fs/promises'
export async function rewriteUrls(body: string) {




    let output = body

    const resolvedUrls: Record<string, string> = {}
    const resolvableUrls: string[] = []
    for (const url of body.match(URL_REGEX) || []) {

        resolvableUrls.push(url)
    }

    await Promise.all((body.match(URL_REGEX) || []).map(async (url) => {
        const resolvedUrl = await getProxiedUrl(url)
        resolvedUrls[url] = resolvedUrl
    }))
    

    for (const url of body.match(URL_REGEX) || []) {
        const regex = new RegExp(url, "g")
        if(url.startsWith("http://www.w3.org/2000/svg"))
        continue
       output =  output.replace(regex, resolvedUrls[url])
    }


    return output
}
