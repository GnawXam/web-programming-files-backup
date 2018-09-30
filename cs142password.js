"use strict";

/* jshint node: true */

const crypto = require('crypto');


/*
 * Return a salted and hashed password entry from a
 * clear text password.
 * @param {string} clearTextPassword
 * @return {object} passwordEntry
 * where passwordEntry is an object with two string
 * properties:
 *      salt - The salt used for the password.
 *      hash - The sha1 hash of the password and salt
 */
function makePasswordEntry(clearTextPassword) {
  // we assume there's a text input

  var retObj = {};

  if(clearTextPassword){
    const buf = crypto.randomBytes(8);
    retObj.salt = buf.toString('hex');

    const cryptoHash = crypto.createHash('sha1');
    cryptoHash.update(clearTextPassword + retObj.salt);
    retObj.hash = cryptoHash.digest('hex');
  }
  return retObj;
}

/*
 * Return true if the specified clear text password
 * and salt generates the specified hash.
 * @param {string} hash
 * @param {string} salt
 * @param {string} clearTextPassword
 * @return {boolean}
 */
function doesPasswordMatch(hash, salt, clearTextPassword) {
  const cryptoHash = crypto.createHash('sha1');
  cryptoHash.update(clearTextPassword + salt);
  var hashStr = cryptoHash.digest('hex');
  
  return hash === hashStr;
}

module.exports = {makePasswordEntry, doesPasswordMatch};
