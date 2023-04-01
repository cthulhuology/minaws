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

