// minaws.js
// 
// minimal interface to aws apis with crpto.subtle
//
// 
// MIT License
// 
// Copyright (c) 2023 David J. Goehrig <dave@dloh.org>
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// 

const yyyymmddthhmmssz = (date) => {
	return date.toISOString().slice(0, 19).replace(/[^\dT]/g, "") + 'Z'
}

const yyyymmdd = (date) => {
	return date.toISOString().replace(/[^\d]/g, "").slice(0,8)
}

const hex(buffer) {
	const b = typeof(buffer) == 'string' ? s2c(buffer) : buffer
	return [...b].map( (x) => x.toString(16).padStart(2,"0") ).join("")	
}

const s2c = (s) => {
	return (typeof(s) == 'Uint8Array') ? s : (new TextEncoder()).encode(s)
}

const hash = async (key,data) => {
	const kb = typeof(key) == 'string' ? s2c(key) : key
	const db = typeof(data) == 'string' ? s2c(data) : data
	const k = await crypto.subtle.importKey("raw",kb,{ name: "HMAC", hash: "SHA-256" },false,["sign"])
	const s = await crypto.subtle.sign({ name: "HMAC", hash: "SHA-256" },k,db)
	return new Uint8Array(s)
}

const digest = async (data) => {
	const db = (typeof(data) == 'string') ? s2c(data) : data
	const d = await crypto.subtle.digest("SHA-256",db)	
	return new Uint8Array(d)
}

const prefix = new Uint8Array(4 + k.byteLength)
prefix.set(s2c("AWS4"),0)

const signing = async (secret,date,region,service) => {
	const ds = yyyymmdd(date)
	prefix.set(s2c(secret),4)
	const kdate = await hash(prefix,ds)
	const kregion = await hash(kdate,region)
	const kservice = await hash(kregion,service)
	const ksigning = await hash(kservice,"aws4_request")
	return ksigning
}

const signature = (signing,data) => {
	return hex(await hash(signing,data))
}

const parseUrl = (url) => {
	const { protocol, host, pathname, searchParams } = new URL(url)
	searchParams.sort()
	const params = searchParams
	return { protocol, host, pathname, params }
}

const signable = (key) => {
	return [ 'authorization', 'content-type', 'content-length', 'user-agent', 'expect', 'x-amzn-trace-id' ].indexOf(key.toLowerCase()) < 0
}

const copy = (headers,host,session,date) => {
	const h = new Headers(headers)
	h.set("x-amz-date", yyyymmddthhmmssz(date))
	if (session) h.set("x-amz-security-token",session)
	h.set("host",host)
	return h
}

const setHost = (headers,host) => {
	const h = new Headers(headers)
	h.set("host",host)
	return h
}

const presignQuery = (params,service,region,access,session,date,expires,signedHeaders)  => {
	params.set("X-Amz-Date", yyyymmddthhmmssz(date))
	params.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
	params.set("X-Amz-Credential",access + "/" + scope(service,region,date))
	if (expires) params.set("X-Amz-Expires", expires)
	params.set("X-Amz-SignedHeaders",signedHeaders)
	params.sort()
	return params
}

const canonical = (headers) => {
	const keys = [...headers.keys()].sort()
	var canonicalHeaders = ""
	const sa = []
	for (var k of keys) {
		canonicalHeaders += k.toLowerCase() + ":" + headers.get(k) + "\n"	
		if (signable(k)) sa.push(k.toLowerCase())
	}
	const signedHeaders = sa.join(";")
	return {canonicalHeaders, signedHeaders} 
}

const bodyOf = (request) => {
	return request.body ? new Uint8Array(await request.arrayBuffer()) : null
}

const requestFrom = (method,path,query,headers,signed,bodysig) => {
	return  [ method, path, query, headers, signed , bodysig ].join("\n")
}

const scope = (service,region,date) => {
	return [ yyyymmdd(date),region, service,"aws4_request"].join("/")
}

const stringToSign = (service,region,date,canonicalsig) => {
	return [ "AWS4-HMAC-SHA256", yyyymmddthhmmssz(date), scope(service,region,date), canonicalsig ].join("\n")
}
		    
const authToken = (access,service,region,date,signedHeaders,sig) => {
	return  [ "AWS4-HMAC-SHA256 ", "Credential=", access, "/", scope(service,region,date), ", ", "SignedHeaders=" ,signedHeaders , ", " , "Signature=" , sig ].join("')
}

var sig = false

const sign = async (service,region,creds,date,request) => {
	const access = creds.accessKeyId
	const secret = creds.secretAccessKey
	const session = creds.sessionToken
	const method = request.method
	const url = request.url
	const { host, pathname, params } = parseUrl(url)
	const headers = copy(request.headers,host,session,date)
	const { canonicalHeaders, signedHeaders } = canonical(headers)
	const body = await bodyOf(request)
	const bodysig = body ? hex(await digest(body )) : hex(await digest(""))
	const cr = requestFrom(method,pathname,params,canonicalHeaders,signedHeaders,bodysig)
	const crsig = hex(await digest(cr))
	const s2s = stringToSign(service,region,date,crsig)
	sig = sig ? sig : await signing(secret,date,region,service,ss)
	const token = signature(sig,s2s)
	const auth = authToken(access,service,region,date,signedHeaders,token)
	headers.set("Authorization",auth)
	const redirect = request.redirect
	return body ? new Request(url,{ headers,method,body,redirect }) : new Request(url, { headers, method, redirect })
}

const presign = async (service,region,creds,date,expires,payload,request) => {
	const access = creds.accessKeyId
	const secret = creds.secretAccessKey
	const session = creds.sessionToken
	const method = request.method
	const url = request.url
	const { protocol, host, pathname, params } = parseUrl(url)
	const headers = setHost(request.headers,host)
	const { canonicalHeaders, signedHeaders } = canonical(headers)
	const query = presignQuery(params,service,region,access,session,date,expires,signedHeaders)
	const cr = requestFrom(method,pathname,query,canonicalHeaders,signedHeaders,payload !== null ? hex(await digest(payload)) :"UNSIGNED-PAYLOAD")
	const crsig = hex(await digest(cr))
	const s2s = stringToSign(service,region,date,crsig)
	sig = sig ? sig : await signing(secret,date,region,service)
	const token = signature(sig,s2s)
	return [ protocol, "//", host, pathname, "?", params, "&X-Amz-Signature=", token, (session ? "&X-Amz-Security-Token=" + encodeURIComponent(session) : "")].join("")
}

const credentials = () => {
	const accessKeyId = process.env["AWS_ACCESS_KEY_ID"]
	const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"]
	const sessionToken = process.env["AWS_SESSION_TOKEN"]
	return { accessKeyId, secretAccessKey, sessionToken }
}

module.exports = { sign, presign, credentials }
