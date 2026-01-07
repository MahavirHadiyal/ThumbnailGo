import express from 'express'
import { LoginUser, logoutUser, registerUser, verifyUser } from '../controllers/AuthControllers.js'
import protect from '../middlewares/auth.js'

const AuthRouter = express.Router()

AuthRouter.post('/register',registerUser)
AuthRouter.post('/login',LoginUser)
AuthRouter.get('/verify',protect,verifyUser)
AuthRouter.post('/logout',protect,logoutUser)

export default AuthRouter