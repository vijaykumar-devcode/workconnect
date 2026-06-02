const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mockRequire = require('mock-require');

const offerModelPath = path.join(__dirname, '..', 'src', 'modules', 'offers', 'offer.model.js');
const applicationModelPath = path.join(__dirname, '..', 'src', 'modules', 'applications', 'application.model.js');
const emailServicePath = path.join(__dirname, '..', 'src', 'services', 'emailService.js');

let currentOffer = null;
let currentApplication = null;

const buildOfferQuery = () => ({
  populate: () => ({
    populate: () => Promise.resolve(currentOffer)
  })
});

mockRequire(offerModelPath, {
  findById: () => buildOfferQuery(),
  create: async () => ({})
});

mockRequire(applicationModelPath, {
  findById: async () => currentApplication
});

mockRequire(emailServicePath, {
  offerEmail: async () => { }
});

const offerService = require('../src/modules/offers/offer.service');

const makeOffer = ({ candidateId = 'candidate-1', companyId = 'company-1' } = {}) => ({
  _id: 'offer-1',
  candidate: { _id: candidateId },
  application: {
    _id: 'application-1',
    job: {
      _id: 'job-1',
      company: { _id: companyId }
    }
  },
  status: 'Sent',
  save: async function save() {
    return this;
  }
});

const makeApplication = () => ({
  _id: 'application-1',
  currentStage: 'Offer Sent',
  stageHistory: [],
  save: async function save() {
    return this;
  }
});

test('rejects access to another candidate offer', async () => {
  currentOffer = makeOffer({ candidateId: 'candidate-1', companyId: 'company-1' });
  currentApplication = makeApplication();

  await assert.rejects(
    () => offerService.getOfferById('offer-1', { _id: 'candidate-2', role: 'CANDIDATE' }),
    (error) => error.statusCode === 403 && /not authorized/i.test(error.message)
  );
});

test('rejects employer updating final candidate decision (Accepted)', async () => {
  currentOffer = makeOffer({ candidateId: 'candidate-1', companyId: 'company-1' });
  currentApplication = makeApplication();

  await assert.rejects(
    () => offerService.updateOfferStatus('offer-1', 'Accepted', {
      _id: 'employer-1',
      role: 'EMPLOYER',
      company: 'company-1'
    }),
    (error) => error.statusCode === 403 && /not authorized/i.test(error.message)
  );
  // Ensure audit fields not set by unauthorized actor
  assert.equal(currentOffer.status, 'Sent');
  assert.equal(currentOffer.statusUpdatedBy, undefined);
  assert.equal(currentOffer.statusSource, undefined);
});
