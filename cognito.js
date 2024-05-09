// cognito.js
//
// © 2024 David Goehrig <dave@dloh.org>
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
//

async function getId(region,identityPoolId,provider,jwt) {
	const service = "cognito-identity"
	const endpoint = "https://" + service + "." + region + ".amazonaws.com"
	const target = "com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.GetId"
	const method = "POST"
	const xamzdate = (new Date()).toISOString().slice(0, 19).replace(/[^\dT]/g, "") + 'Z' // YYYYMMDDTHHMMSSZ
	const headers = new Headers({
		"X-AMZ-DATE" : xamzdate,
		"X-AMZ-TARGET": target,
		"CONTENT-TYPE": "application/x-amz-json-1.1",
	})
	const params = {
		"IdentityPoolId": identityPoolId,
		"Logins": {}
	}
	params.Logins[provider] = jwt
	const body = JSON.stringify(params)
	const req = new Request(endpoint, { method, headers, body })
	const resp = await fetch(req)
	const json = await resp.json()
	return json.IdentityId
}

async function getCredentialsForIdentity(region,identityId,provider,jwt) {
	const service = "cognito-identity"
	const endpoint = "https://" + service + "." + region + ".amazonaws.com"
	const target = "com.amazonaws.cognito.identity.model.AWSCognitoIdentityService.GetCredentialsForIdentity"
	const method = "POST"
	const xamzdate = (new Date()).toISOString().slice(0, 19).replace(/[^\dT]/g, "") + 'Z' // YYYYMMDDTHHMMSSZ
	const headers = new Headers({
		"X-AMZ-DATE" : xamzdate,
		"X-AMZ-TARGET": target,
		"CONTENT-TYPE": "application/x-amz-json-1.1",
	})
	const params = {
		"IdentityId": identityId,
		"Logins": {}
	}
	params.Logins[provider] = jwt
	const body = JSON.stringify(params)
	const req = new Request(endpoint, { method, headers, body })
	const resp = await fetch(req)
	const json = await resp.json()
	return json
}

async function credentials(region,identityPoolId,provider,jwt) {
	const identityId = await getId(region,identityPoolId,provider,jwt)
	const cognito = await getCredentialsForIdentity(region,identityId,provider,jwt)
	const accessKeyId = cognito.Credentials.AccessKeyId
	const secretAccessKey = cognito.Credentials.SecretKey
	const sessionToken = cognito.Credentials.SessionToken
	return { accessKeyId, secretAccessKey, sessionToken }
}


