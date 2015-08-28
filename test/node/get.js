/* global describe, it, beforeEach, before, after, expect */

var path = require('path')
var http = require('http')
var imgServer = require('../../')
var fs = require('vigour-fs')
var Promise = require('promise')
var readdir = Promise.denodeify(fs.readdir)
var writeFile = Promise.denodeify(fs.writeFile)
var sampleImage = 'https://upload.wikimedia.org/wikipedia/commons/8/8c/JPEG_example_JPG_RIP_025.jpg'
var encoded = encodeURIComponent(sampleImage)
var base = '/image/600/400?url=' + encoded
var host = 'localhost'
var port = 8000
var handle
var root = path.join(__dirname, '..', '..')
var outPath = path.join(root, 'out')
var originalsPath = path.join(root, 'originals')

describe('Clean', function () {
  beforeEach(function (done) {
    writeFile(path.join(outPath, 'tmpTestFile.txt'), 'Hello World', 'utf8')
      .then(function () {
        return writeFile(path.join(originalsPath, 'tmpTestFiles.txt'), 'Hello World', 'utf8')
      })
      .done(done)
  })
  it('should clean `out/` and `originals/`', function (done) {
    expectCachedFiles(true)
      .then(function () {
        return imgServer({ clean: true })
      })
      .then(function () {
        return expectCachedFiles(false)
      })
      .done(done)
  })
})

describe('Routes', function () {
  before(function (done) {
    this.timeout(5000)
    imgServer()
      .then(function (_handle) {
        handle = _handle
        done()
      })
  })
  describe('GET /image/:width/:height', function () {
    describe('Effects', function () {
      var effects =
        [ '',
        '&effect=smartResize',
        '&effect=composite&overlay=overlay',
        '&effect=blur&radius=0&sigma=3',
        '&effect=tMask&mask=avatarMask',
        '&effect=mask&mask=logoMask&fillColor=EE255C',
        '&effect=overlay&overlay=overlay',
        '&effect=tMask&mask=logoMask',
        '&effect=overlayBlur&overlay=overlay&radius=0&sigma=3'
        ]
      var png = effects.map(function (item) {
        return item + '&outType=png'
      })
      var jpg = effects.map(function (item) {
        return item + '&outType=jpg'
      })
      var attempts = effects.concat(png, jpg)
      attempts.map(function (effect) {
        var fullPath = base + effect
        it('`' + effect + '`', attempt(fullPath))
      })
    })
  })

  // TODO Obsolete this
  describe('GET /image/:id/:width/:height', function () {
    it('should find the correct image and serve a resized version'
      , attempt('/image/310b69fb4db50d3fc4374d2365cdc93a/900/600'))
  })

  // describe('Caching', function () {
  //   it('should be enabled by default', function (done) {
  //     expectCachedFiles(true)
  //       .done(done)
  //   })
  //   it('should be disabled by `&cache=false`', function (done) {
  //     imgServer({ clean: true })
  //       .then(function () {
  //         attempt(base + '&cache=false')(function () {
  //           // Give it time to clean up
  //           setTimeout(function () {
  //             expectCachedFiles(false)
  //               .done(done)
  //           }, 1000)
  //         })
  //       })
  //   })
  // })

  after(function (done) {
    handle.close(function () {
      done()
    })
  })
})

function expectCachedFiles (bool) {
  return readdir(outPath)
    .then(check)
    .then(function () {
      return readdir(originalsPath)
    })
    .then(check)

  function check (files) {
    // Don't forget to account for .gitignore
    if (bool) {
      expect(files.length).to.be.gt(1)
    } else {
      expect(files.length).to.equal(1)
    }
  }
}

function attempt (fullPath) {
  return function () {
    return new Promise(function (resolve, reject) {
      var reqOptions =
        { path: fullPath,
          port: port,
          hostname: host
        }
      // console.log("reqOptions", reqOptions)
      var req = http.request(reqOptions
      , function (res) {
        var total = ''
        res.on('error', reject)
        res.on('data', function (chunk) {
          total += chunk
        })
        res.on('end', function () {
          if (res.statusCode !== 200) {
            console.log('RESULT', total.toString())
          }
          expect(res.statusCode).to.equal(200)
          resolve()
        })
      })
      req.on('error', reject)
      req.end()
    })
    .catch(function (reason) {
      console.error('An error occured', reason)
    })
  }
}
