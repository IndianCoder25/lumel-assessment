import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import * as controller from '../controllers/controller'

const upload = multer({
    dest: path.join(__dirname, '../uploads')
})

const router = Router()


router.post('/bulk', upload.single('csvFile'), (req, res, next) => {
    Promise.resolve(controller.bulkPost(req, res)).catch(next)
})

router.get('/customer/analytics', (req, res, next) => {
    Promise.resolve(controller.customerAnalytics(req, res)).catch(next)
})


export default router
