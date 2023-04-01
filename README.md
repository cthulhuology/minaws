minAWS - minimal AWS interface
==============================

This module is a minimal interface to AWS using SigV4 requests.

Currently it doesn't depend on anything other than nodejs v19.x or a current browser.

There's some sample code in the samples directory to see how to use it.

The code should be legible enough.

Getting Started
---------------

Let's say you have some AWS credentials (more on this in another repo) and you want to
create a mqtt connection using Matteo Collina's excellent mqtt.js repo found on this here
Github. You can do something like:

	const mqtt = require('mqtt')
	const { presign, credentials } = require('minaws')

	const d = new Date()
	const service = "iotdevicegateway"
	const region = process.env["AWS_DEFAULT_REGION"]
	const endpoint = process.env["AWS_IOT_ENDPOINT"]
	const method = "GET"
	const req = new Request(["wss://",endpoint,"/mqtt"].join(""), { method })

	const main = async () => {
		const url = await presign(service,region,credentials(),d,0,"",req)
		const client = mqtt.connect(url)
		client.on("connect", () => {
			client.subscribe('#', (err) => {
				if (err) return err
				client.publish('hello','hello world!')
				client.on('message', (topic,message) => {
					console.log(message.toString())
					client.end()
				})
			})
		})
	}
	main()



