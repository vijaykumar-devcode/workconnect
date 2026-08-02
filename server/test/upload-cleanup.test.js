const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, describe, before, after, it } = require('node:test');
const assert = require('node:assert');
const { uploadFile } = require('../src/modules/upload/upload.controller');
const uploadService = require('../src/services/uploadService');

describe('Upload Temporary File Cleanup Integration Tests', () => {
  let originalHandleUpload;

  before(() => {
    // Mock the upload service to avoid hitting real Cloudinary
    originalHandleUpload = uploadService.handleUpload;
    uploadService.handleUpload = async (file, category) => {
      if (category === 'avatar') {
        return { fileUrl: 'http://mock.url/avatar.png' };
      }
      if (category === 'company_logo') {
        throw new Error('Simulated Cloudinary failure');
      }
      return { fileUrl: 'http://mock.url/file.pdf' };
    };
  });

  after(() => {
    uploadService.handleUpload = originalHandleUpload;
  });

  const createMockReqRes = (category, originalname = 'test.pdf', mimetype = 'application/pdf') => {
    const tempPath = path.join(os.tmpdir(), `test-upload-${Date.now()}-${originalname}`);
    fs.writeFileSync(tempPath, 'dummy content');
    
    const req = {
      body: { category },
      query: {},
      headers: {},
      file: {
        path: tempPath,
        originalname,
        mimetype,
        size: 1024,
      }
    };
    
    let resStatus = null;
    let resJson = null;
    let nextError = null;
    let resolveTest;
    const testPromise = new Promise(resolve => { resolveTest = resolve; });
    
    const res = {
      status: (code) => {
        resStatus = code;
        return {
          json: (data) => { resJson = data; resolveTest(); }
        };
      }
    };
    
    const next = (err) => { nextError = err; resolveTest(); };
    
    return { req, res, next, getRes: async () => { await testPromise; return { resStatus, resJson, nextError }; }, tempPath };
  };

  it('should remove temporary file when validation fails (invalid category)', async () => {
    const { req, res, next, tempPath, getRes } = createMockReqRes('invalid_category');
    assert.strictEqual(fs.existsSync(tempPath), true, 'Temp file should exist initially');

    await uploadFile(req, res, next);
    
    const { nextError } = await getRes();
    assert.ok(nextError, 'Should throw validation error');
    assert.strictEqual(nextError.statusCode, 400);
    assert.strictEqual(fs.existsSync(tempPath), false, 'Temp file should be deleted after validation failure');
  });

  it('should remove temporary file when upload is successful', async () => {
    const { req, res, next, tempPath, getRes } = createMockReqRes('avatar', 'avatar.png', 'image/png');
    assert.strictEqual(fs.existsSync(tempPath), true, 'Temp file should exist initially');

    await uploadFile(req, res, next);
    
    const { resStatus, resJson } = await getRes();
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resJson.data.fileUrl, 'http://mock.url/avatar.png');
    assert.strictEqual(fs.existsSync(tempPath), false, 'Temp file should be deleted after successful upload');
  });

  it('should remove temporary file when Cloudinary throws an error', async () => {
    const { req, res, next, tempPath, getRes } = createMockReqRes('company_logo', 'logo.png', 'image/png');
    assert.strictEqual(fs.existsSync(tempPath), true, 'Temp file should exist initially');

    await uploadFile(req, res, next);
    
    const { nextError } = await getRes();
    assert.ok(nextError, 'Should throw Cloudinary error');
    assert.strictEqual(nextError.message, 'Simulated Cloudinary failure');
    assert.strictEqual(fs.existsSync(tempPath), false, 'Temp file should be deleted after Cloudinary failure');
  });
});
