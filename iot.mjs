import  mqtt from 'mqtt'
import { presign, credentials } from 'minaws'

export const iot = async (endpoint,region,creds) => {
	const d = new Date()
	const service = "iotdevicegateway"
	region ||= process.env["AWS_DEFAULT_REGION"]
	endpoint ||= process.env["AWS_IOT_ENDPOINT"]
	creds ||= credentials()
	const method = "GET"
	const req = new Request(["wss://",endpoint,"/mqtt"].join(""), { method })
	const url = await presign(service,region,creds,d,0,"",req)
	const client = mqtt.connect(url)
	return client;
}

