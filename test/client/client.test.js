'use strict';
/**
 * Created by toddgeist on 12/11/16.
 */

const assert = require('assert')
const client = require('../../index');
const auth = {
    user: 'admin',
    pass : 'admin'
  };




describe( 'dbnames' , function() {

  it('should return dbnames' , function( ) {

    const options = {
      server: process.env.SERVER_URL,
      auth ,
      command :{
        '-dbnames' : true
      }
    };
    return client(options)
      .then(json=>{
        assert(json.errorCode === 0, 'errorCode = 0')
        return json
      })
  })

});

describe( 'findall' , function() {


  it('should return some records' , function( ) {
    const options = {
      server: process.env.SERVER_URL,
      auth ,
      command :{
        '-db' : 'Test',
        '-findall' : true,
        '-lay' : 'people'
      }
    };
    return client(options)
      .then(json=>{
        assert(json.errorCode === 0, 'errorCode = 0')
        return json
      })
  })

});