import { PROXY_HOST } from "./constants";
import { Domain } from "./domain.model";

function generateRandomString(): string {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  let randomString = "";

  for (let i = 0; i < 10; i++) {
    randomString += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }

  return randomString;
}

export async function getSubdomainForHost(host: string): Promise<string> {
  let row = await Domain.findOne({ host });
  if (!row) {
    row = await Domain.create({ subdomain: generateRandomString(), host });
  }
  console.log(row.subdomain);

  return row.subdomain;
}

export async function getHostForSubdomain(subdomain: string): Promise<string> {
  const row = await Domain.findOne({ subdomain });

  if (!row) {
    throw new Error(`Subdomain not found: ${subdomain}`);
  }
  return row.host;
}
export async function getHostNameForSubdomain(
  subdomain: string
): Promise<string> {
  const host = await getHostForSubdomain(subdomain);
  const url = new URL(host);
  return url.hostname;
}
export const getProxiedUrl = async (
  url: string,
  hashed = false
): Promise<string> => {
  const fixedUrl = url.startsWith("http") ? url : `https:${url}`;
  const parsedUrl = new URL(fixedUrl);
  const { protocol, hostname, port } = parsedUrl;

  const newUrl = new URL(fixedUrl);
  newUrl.protocol = "https";
  let h = await getSubdomainForHost(
    `${protocol.replace(":", "")}://${hostname}${port !== "" ? ":" + port : ""}`
  );
  newUrl.hostname = `${h}.${PROXY_HOST}`;
  console.log(`${h}.${PROXY_HOST}`);
  return newUrl.toString();
};

export const getRealUrl = async (proxyUrl: string): Promise<string> => {
  try {
    const parsedUrl = new URL(proxyUrl);
    const { host } = parsedUrl;
    const realDomainString = await getHostForSubdomain(host.split(".")[0]);
    const { protocol, port, host: domainReal } = new URL(realDomainString);
    const newUrl = new URL(proxyUrl);
    newUrl.host = domainReal;
    newUrl.port = port;
    newUrl.protocol = protocol;
    console.log(newUrl.toString());

    return newUrl.toString();
  } catch (ex: any) {
    console.error("Couldn't rewrite", proxyUrl, ex.message);

    console.error(ex);
    return proxyUrl;
  }
};

export const getTarget = (proxyUrl: string): Promise<string> => {
  const parsedUrl = new URL(proxyUrl);
  const { host } = parsedUrl;
  return getHostForSubdomain(host.split(".")[0]);
};
