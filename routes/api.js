/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var MDB = require('../db');
 const { body, query, validationResult } = require('express-validator')
  
module.exports = function (app) {
    
  // The method Validate uses express-validator to validate incoming parameters to the different requests and creates erorr message
  var validate = (method) => {
    switch (method) {
      case 'postThread': {
       return [ 
          body('text').exists(),
          body('delete_password').exists()
         ]   
      }
      case 'putThread': {
       return [ 
          body('thread_id').exists().isMongoId()
         ]   
      }
      case 'deleteThread': {
       return [ 
          body('thread_id').exists().isMongoId(),
          body('delete_password').exists()
         ]   
      }
      case 'getReplies': {
       return [ 
          query('thread_id').exists().isMongoId()
         ]   
      }
      case 'postReply': {
        return [ 
          body('thread_id').exists().isMongoId(),
          body('text').exists(),
          body('delete_password').exists()
        ]   
      }
      case 'putReply': {
        return [ 
          body('thread_id').exists().isMongoId(),
          body('reply_id').exists().isMongoId()
        ]   
      }
      case 'deleteReply': {
        return [ 
          body('thread_id').exists().isMongoId(),
          body('reply_id').exists().isMongoId(),
          body('delete_password').exists()
        ]   
      }
    }
  }
  
  app.route('/api/threads/:board')
    .get(async function (req, res){
      var db=MDB.get();
      var board=req.params.board;
      
      try{
        let docs = await db.collection(board)
                        .find({})
                        .project({ reported: 0, delete_password: 0, 'replies.reported': 0, 'replies.delete_password': 0 })
                        .sort({bumped_on:-1})
                        .limit(10)
                        .toArray();

        // I Remove every reply except the last 3 for every thread
        for (let i in docs){
          if (Array.isArray(docs[i].replies)){
            docs[i].replycount=docs[i].replies.length;
            while (docs[i].replies.length > 3){
              docs[i].replies.shift();
            }
          }else{
            docs[i].replycount=0;
          }
        }
        // console.log(JSON.stringify(docs));
        res.json(docs)
      } catch(err){
        if (Object.entries(err).length === 0) return res.json([{}]);
        return res.json({ message: 'failure', err: err});
      }
  })
  
    .post(validate('postThread'), async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
    // _id, text, created_on(date&time), bumped_on(date&time, starts same as created_on), reported(boolean), delete_password, & replies(array)
      var board=req.params.board;
      var db=MDB.get();
      var now= new Date();
      let redir=req.query.redirect==='false' ? false:true;
      var obj={
        text: req.body.text,
        created_on: now,
        bumped_on: now,
        reported: false,
        delete_password: req.body.delete_password,
        replies: []
      }
      
      try{
        
        let r=await db.collection(board).insertOne(obj);
        if (redir) return res.redirect('/b/'+board);
        
        var respObj={
          _id: obj._id,
          text: req.body.text,
          created_on: now,
          bumped_on: now
        };
        
        return res.json(respObj);
      
      } catch(err){
        
        console.log(err);
        
        return res.json({message: err});
        
      }
  })
  
    .put(validate('putThread'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();
      var board=req.params.board;
      var threadId = new ObjectId(req.body.thread_id);

      try{
        let doc= await db.collection(board).updateOne({_id: threadId},{ $set:{reported:true}});
        if (doc.modifiedCount===1) res.set('text/plain').send('success');
        else res.set('text/plain').send('not success');
      } catch(err){
        res.set('text/plain').send('not success');
      }
    })
  
    .delete(validate('deleteThread'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();
      var board=req.params.board;
      var threadId = new ObjectId(req.body.thread_id);
      var delete_password = req.body.delete_password;

      try{
        let doc= await db.collection(board).deleteOne({_id: threadId, delete_password: delete_password });
        if (doc.deletedCount==1) return res.set('text/plain').send('success');
        else return res.set('text/plain').send('incorrect password')
      } catch(err){
        res.set('text/plain').send('incorrect password');
      }

  });
     
  app.route('/api/replies/:board')
    .get(validate('getReplies'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();
      var board=req.params.board;
      var threadId = new ObjectId(req.query.thread_id);

      try{
        let doc= await db.collection(board)
                         .findOne({ _id:threadId }, 
                           {projection: 
                              { reported: 0, delete_password: 0, 'replies.reported': 0, 'replies.delete_password': 0 }});  
        res.json(doc)
      } catch(err){
        res.json({ message: 'failure'});
      }
    
  })
  
    .post(validate('postReply'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();
      
      var board=req.params.board;
      var threadId = new ObjectId(req.body.thread_id);
      var text = req.body.text;
      var db=MDB.get();
      let now = new Date();
      let redir=req.query.redirect==='false' ? false:true;
      let delete_password= req.body.delete_password;
    
      var obj={
        _id: new ObjectId(),
        text: text,
        created_on: now,
        reported: false,
        delete_password: delete_password
      }
    
      try{
        let doc=await db.collection(board).findOneAndUpdate(
                                            { _id: threadId}, 
                                            {  $push: {replies: obj }, $set: {bumped_on: now}},
                                            {returnOriginal: false, projection: { reported: 0, delete_password: 0, 'replies.reported': 0, 'replies.delete_password': 0 }});
        
        if (doc.lastErrorObject.updatedExisting==false) return res.json({ message: 'no thread exists' });
        else if (redir) return res.redirect(302, '/b/'+board+'/'+ threadId);
        else return res.json(doc.value);

      }catch (err){
        res.json({ message: 'could not post reply' });
      }
      })
  
    .put(validate('putReply'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();  
      var board=req.params.board;
      var threadId = new ObjectId(req.body.thread_id);
      var replyId = new ObjectId(req.body.reply_id);
      try{
        let doc= await db.collection(board).updateOne(
          { _id: threadId, "replies._id": replyId }, 
          {$set: {"replies.$.reported": true}});
        
        if (doc.modifiedCount===1) res.set('text/plain').send('success');
        else res.set('text/plain').send('not success');
        
      } catch(err){
        res.set('text/plain').send('not success');
      }
  })
  
    .delete(validate('deleteReply'),async function (req, res){
      const errors = validationResult(req); // Finds the validation errors in this request and wraps them in an object with handy functions
      if (!errors.isEmpty()) {
        res.status(422).json({ errors: errors.array() });
        return;
      }
      var db=MDB.get();
      var board=req.params.board;
      var threadId = new ObjectId(req.body.thread_id);
      var replyId = new ObjectId(req.body.reply_id);
      var delete_password = req.body.delete_password;
    
      try{

        let doc= await db.collection(board).updateOne(
          { _id:threadId, replies: {$elemMatch: {"_id": replyId, "delete_password": delete_password}}}, 
          {$set: {"replies.$.text": "deleted"}});    
        if (doc.modifiedCount===1) res.set('text/plain').send('success');
        else res.set('text/plain').send('incorrect password');

      }catch(err){
        res.set('text/plain').send('incorrect password');
      }
    
  });
 
};
