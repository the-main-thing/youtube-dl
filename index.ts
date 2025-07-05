import { spawn } from 'child_process'
import index from './index.html'

function download(
	send: (message: string) => void,
	link: string,
): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const proc = spawn('yt-dlp', [
			'--no-check-certificate',
			'--ignore-errors',
			'--restrict-filenames',
			'--output',
			`~/Youtube/%(title)s.%(ext)s`,
			link,
		])
		proc.stdout.on('data', (data) => {
			const msg = data.toString()
			console.log(msg)
			send(msg)
		})
		proc.stderr.on('data', (data) => {
			const msg = data.toString()
			console.error(msg)
			send(msg)
		})
		proc.on('exit', (code) => {
			console.log(`Process exited with code ${code}`)
			if (code) {
				reject(code)
				send('Error')
				return
			}
			resolve(code || 0)
			send('\n\nDone\n\n')
		})
	})
}

Bun.serve({
	port: 4269,
	routes: {
		'/': index,
	},
	fetch(req, server) {
		// upgrade the request to a WebSocket
		if (server.upgrade(req)) {
			return // do not return a Response
		}
		return new Response(null, { status: 501 })
	},
	websocket: {
		async message(ws, message) {
			if (typeof message !== 'string') {
				return
			}
			const exitCode = await download((msg) => ws.send('<br>' + msg), message)
			if (exitCode) {
				ws.send('<br>Мам, готово, смотри в папке Youtube')
			} else {
				ws.send('<br>Какая-то ошибка, сфоткай экран, покежь')
			}
		},
	},
})
