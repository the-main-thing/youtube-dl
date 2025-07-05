import { spawn } from 'child_process'

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
		'/': new Response(indexHTML(), {
			headers: {
				'Content-Type': 'text/html',
				'Cache-Control': 'no-cache',
			},
		}),
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
			const exitCode = await download(
				(msg) => ws.send('<br>' + msg),
				message,
			)
			if (exitCode) {
				ws.send('<br>Какая-то ошибка, сфоткай экран, покежь')
			} else {
				ws.send('<br>Мам, готово, смотри в папке Youtube')
			}
		},
	},
})

function indexHTML() {
	return `
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Скачать youtube</title>
		<style>
			form {
				display: flex;
				flex-direction: column;
				align-items: center;
				justify-content: center;
				margin: auto;
				margin-top: 20px;
				width: 70vw;
			}

			input {
				width: 100%;
				padding: 12px 20px;
				margin: 8px 0;
				box-sizing: border-box;
				border: 2px solid #ccc;
				border-radius: 4px;
			}

			button {
				background-color: #4caf50;
				color: white;
				padding: 14px 20px;
				margin: 8px 0;
				border: none;
				cursor: pointer;
				width: 100%;
			}

			button:hover {
				opacity: 0.8;
			}

			#log {
				white-space: pre-wrap;
				font-family: monospace;
				font-size: 1.2em;
			}
		</style>
	</head>
	<body>
		<div>
			<h1>Version 1.0.1</h1>
			<div>
				<p id="error"></p>
				<input id="url-input" type="url" name="url" placeholder="Введите ссылку на видео" />
        <button onClick="download()" type="submit">Скачать</button>
			</div>
			<div style="max-width: 50vw; margin: 0 auto">
				<code id="log"></code>
			</div>
		</div>
		<script>
			const ws = new WebSocket('ws://localhost:4269/ws')
			ws.onmessage = function (event) {
				log.innerHTML += event.data
				log.scrollIntoView({ behavior: 'smooth', block: 'end' })
			}
			ws.onerror = function (event) {
				window.location.reload()
			}
			function download() {
				try {
					error.innerHTML = ''
					log.innerHTML = ''
          const urlInput = document.getElementById('url-input')
					const url = new URL(urlInput.value)
					ws.send(url.toString())
				} catch {
					error.innerHTML = 'Неправильный URL'
				}
			}
			// form.onsubmit = function (event) {
			// 	event.preventDefault()
   //      download()
			// 	return false
			// }
		</script>
	</body>
</html>
	`
}
