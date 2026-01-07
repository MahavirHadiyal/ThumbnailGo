import { Request,Response,NextFunction } from "express";

const protect = async(req:Request,res:Response,next:NextFunction)=>{

    const {isLoggedIn,userId} = req.session;

    if(!isLoggedIn || !userId){
      res.status(401).json({message:"you are not logged in"});
    }

    next()

}

export default protect