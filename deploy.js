#!/usr/bin/env node

const COS = require('cos-nodejs-sdk-v5')
const config = require('./deploy-config.json')
const fs = require('fs')
const path = require('path')

const cos = new COS({
    SecretId: config.SecretId,
    SecretKey: config.SecretKey
});

// get files recursivly 
function getFilesSync(ret, filePath) {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
        const files = fs.readdirSync(filePath)
        files.forEach(f => getFilesSync(ret, path.join(filePath, f)))
    } else {
        ret.push(filePath)
    }
}

function main() {
    if (!config.Dist || !fs.statSync(config.Dist).isDirectory) {
        console.error(config.Dist + " is not a valid directory")
        return
    }
    const files = []
    const tasks = []
    getFilesSync(files, config.Dist)
    files.forEach(f => {
        const key = path.relative(config.Dist, f)

        const p = new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: config.Bucket,
                Region: config.Region,
                Key: key,
                Body: fs.createReadStream(f)
            }, (err) => {
                if (err) {
                    reject(err)
                    return
                }
                console.log(`deploy ${f} success`)
                resolve(f)
            })
        })

        tasks.push(p)
    })

    Promise
    .race(tasks)
    .then(() => console.log('\n'))
    .catch(console.error)
}


main()
