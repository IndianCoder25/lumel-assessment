import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import router from './routers/routes'

const port = process.env.PORT || 5000

const app = express()

app.use(cors())
app.use(bodyParser.json())

app.use("/", router)

app.get('/heartbeat', (req: Request, res: Response) => {
    res.json({
        msg: "Server is alive ❤️"
    })
})

app.listen(port, () => {
    console.log('Server started listening on port: ', port);
})
