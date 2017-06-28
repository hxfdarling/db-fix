const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const {spawn} = require('child_process')
const crypto = require('crypto')

let algorithm = 'aes-256-ctr'
/**
 * Buffer decryption
 */
async function decrypt(file, password) {
    //如果解密文件存在则不进行解密 这种情况可能由于程序异常退出，没有完成加密
    let decryptedFile = file + '.decrypt'
    await fse.remove(decryptedFile)
    if (await fse.exists(file)) {
        let decipher = crypto.createDecipher(algorithm, password);
        let filedata = await fse.readFile(file)
        let data = decipher.update(filedata)
        await fse.writeFile(decryptedFile, Buffer.concat([
            data, decipher.final()
        ]));
    }
    return decryptedFile
};
/**
 * Buffer encryption
 */
async function encrypt(file, password) {
    var encryptFile = file + '.encrypt'
    if (await fse.exists(file)) {
        let cipher = crypto.createCipher(algorithm, password)
        let filedata = await fse.readFile(file)
        let data = cipher.update(filedata)
        await fse.writeFile(encryptFile, Buffer.concat([
            data, cipher.final()
        ]));
    }
    return encryptFile
};

async function exportSQL(file, tmpsql) {
    let child = spawn('./lib/sqlite3.exe', [
        file, '.dump'
    ], {cwd: __dirname})
    let result = ''
    let resolve
    let reject
    child
        .stdout
        .on('data', (data) => {
            result += data
        });

    child
        .stderr
        .on('data', (data) => {
            reject(data)
        });
    child
        .stdout
        .on('close', async() => {
            let index = result.lastIndexOf('ROLLBACK; -- due to errors')
            if (index) {
                result = result.substring(0, index)
                result += '\r\nCOMMIT'
            }
            debugger;
            await fse.remove(tmpsql)
            await fse.writeFile(tmpsql, result)
            resolve(tmpsql)
        })
    return new Promise((rs, rj) => {
        resolve = rs
        reject = rj
    })
}

async function importFile(sqlFile, file) {
    await fse.remove(file)
    sqlFile = sqlFile.replace(/\\/g, '/')
    let child = spawn('./lib/sqlite3.exe', [
        file, `.read ${sqlFile}`
    ], {cwd: __dirname})
    let resolve
    let reject

    child
        .stderr
        .on('data', (data) => {
            reject(data)
        });

    child
        .stdout
        .on('close', async() => {
            resolve(file)
        })
    return new Promise((rs, rj) => {
        resolve = rs
        reject = rj
    })
}
/**
 *
 *
 *
 * @param {string} file 需要修复的数据库文件
 * @param {string=} password 数据库密码
 * @param {string=} alg 加密算法 默认aes-256-ctr
 */
async function dbfix(file, password, alg) {
    file = path.resolve(file);
    if (alg) {
        algorithm = alg
    }
    var tmpsql = path.join(file, '../tmp.sql');
    if (password) {
        let decryptedFile = await decrypt(file, password)
        await exportSQL(decryptedFile, tmpsql)
        await importFile(tmpsql, decryptedFile + '.fixed')
        let encryptedFile = await encrypt(decryptedFile + '.fixed', password)
        await fse.rename(encryptedFile, file + '.encrypt.fixed')
        await fse.remove(decryptedFile)
    } else {
        await exportSQL(file, tmpsql)
        await importFile(tmpsql, file + '.fixed')
        let encryptedFile = await encrypt(file + '.fixed', password)
        await fse.rename(encryptedFile, file + '.encrypt.fixed')
    }
    console.log('encrypt success')
}
// dbfix('./test.db', 'c5f2bf8eff0a0385')
module.exports = dbfix