const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const auditModelPath = path.join(__dirname, '..', 'src', 'modules', 'audit', 'audit.model.js');

let auditLogs = [];

mockRequire(auditModelPath, {
  create: async (data) => {
    auditLogs.push(data);
    return data;
  },
  find: (query) => {
    return {
      sort: () => {
        return {
          skip: () => {
            return {
              limit: () => Promise.resolve(auditLogs)
            }
          }
        }
      }
    }
  },
  countDocuments: async () => auditLogs.length
});

const auditService = require('../src/modules/audit/audit.service');

test('logAction creates an audit log entry', async () => {
  auditLogs = [];
  
  await auditService.logAction({
    adminId: 'admin-1',
    adminName: 'Super Admin',
    action: 'DELETE_USER',
    entityType: 'User',
    entityId: 'user-2',
    details: 'Deleted inactive user',
    metadata: { reason: 'violation' },
    ipAddress: '127.0.0.1'
  });

  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, 'DELETE_USER');
  assert.equal(auditLogs[0].metadata.reason, 'violation');
});

test('logAction does not throw on failure', async () => {
  mockRequire.reRequire('../src/modules/audit/audit.service');
  mockRequire(auditModelPath, {
    create: async () => {
      throw new Error('Database connection failed');
    }
  });

  const brokenAuditService = require('../src/modules/audit/audit.service');
  
  // Should not throw
  await assert.doesNotReject(
    () => brokenAuditService.logAction({
      adminId: 'admin-1',
      action: 'FAIL_ACTION'
    })
  );
});

test('getLogs returns correct pagination structure', async () => {
  mockRequire(auditModelPath, {
    create: async (data) => {
      auditLogs.push(data);
      return data;
    },
    find: (query) => {
      return {
        sort: () => {
          return {
            skip: () => {
              return {
                limit: () => Promise.resolve([
                  { action: 'A' },
                  { action: 'B' }
                ])
              }
            }
          }
        }
      }
    },
    countDocuments: async () => 20
  });

  const refreshedAuditService = mockRequire.reRequire('../src/modules/audit/audit.service');
  
  const result = await refreshedAuditService.getLogs({ page: 2, limit: 10 });
  
  assert.equal(result.total, 20);
  assert.equal(result.page, 2);
  assert.equal(result.pages, 2);
  assert.equal(result.logs.length, 2);
});
