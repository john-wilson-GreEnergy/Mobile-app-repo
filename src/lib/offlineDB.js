/**
 * offlineDB.js — IndexedDB wrapper for offline caching
 * Stores: assignments, survey_questions, survey_submissions (pending queue)
 */

const DB_NAME = 'greenergy-offline';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('assignments')) {
        const store = db.createObjectStore('assignments', { keyPath: 'id' });
        store.createIndex('employee_id', 'employee_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('survey_questions')) {
        db.createObjectStore('survey_questions', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('pending_submissions')) {
        const store = db.createObjectStore('pending_submissions', {
          keyPath: 'local_id',
          autoIncrement: true,
        });
        store.createIndex('employee_fk', 'employee_fk', { unique: false });
      }

      if (!db.objectStoreNames.contains('submissions')) {
        const store = db.createObjectStore('submissions', { keyPath: 'id' });
        store.createIndex('employee_fk', 'employee_fk', { unique: false });
      }

      if (!db.objectStoreNames.contains('jobsites')) {
        const store = db.createObjectStore('jobsites', { keyPath: 'id' });
        store.createIndex('jobsite_group', 'jobsite_group', { unique: false });
      }

      if (!db.objectStoreNames.contains('cache_metadata')) {
        db.createObjectStore('cache_metadata', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txStore(db, storeName, mode = 'readonly') {
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

// ── Assignments ────────────────────────────────────────────────────────────

export async function cacheAssignments(assignments) {
  const db = await openDB();
  const store = txStore(db, 'assignments', 'readwrite');
  assignments.forEach((a) => store.put(a));
  return new Promise((res, rej) => {
    store.transaction.oncomplete = res;
    store.transaction.onerror = rej;
  });
}

export async function getCachedAssignments(employeeId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'assignments');
    const index = store.index('employee_id');
    const req = index.getAll(employeeId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Survey Questions ───────────────────────────────────────────────────────

export async function cacheSurveyQuestions(questions) {
  const db = await openDB();
  const store = txStore(db, 'survey_questions', 'readwrite');
  questions.forEach((q) => store.put(q));
  return new Promise((res, rej) => {
    store.transaction.oncomplete = res;
    store.transaction.onerror = rej;
  });
}

export async function getCachedSurveyQuestions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'survey_questions');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Pending Submissions (offline queue) ───────────────────────────────────

export async function queuePendingSubmission(submission) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'pending_submissions', 'readwrite');
    const req = store.add({ ...submission, queued_at: new Date().toISOString() });
    req.onsuccess = () => resolve(req.result); // returns local_id
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSubmissions() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'pending_submissions');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingSubmission(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'pending_submissions', 'readwrite');
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Synced Submissions cache ───────────────────────────────────────────────

export async function cacheSubmissions(submissions) {
  const db = await openDB();
  const store = txStore(db, 'submissions', 'readwrite');
  submissions.forEach((s) => store.put(s));
  return new Promise((res, rej) => {
    store.transaction.oncomplete = res;
    store.transaction.onerror = rej;
  });
}

export async function getCachedSubmissions(employeeFk) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'submissions');
    const index = store.index('employee_fk');
    const req = index.getAll(employeeFk);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Jobsites ───────────────────────────────────────────────────────────────

export async function cacheJobsites(jobsites) {
  const db = await openDB();
  const store = txStore(db, 'jobsites', 'readwrite');
  jobsites.forEach((s) => store.put(s));
  return new Promise((res, rej) => {
    store.transaction.oncomplete = res;
    store.transaction.onerror = rej;
  });
}

export async function getCachedJobsites() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'jobsites');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedJobsitesByGroup(jobsiteGroup) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'jobsites');
    const index = store.index('jobsite_group');
    const req = index.getAll(jobsiteGroup);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ── Cache Metadata (tracking last sync times) ──────────────────────────────

export async function setCacheMetadata(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'cache_metadata', 'readwrite');
    const req = store.put({ key, value, timestamp: Date.now() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getCacheMetadata(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = txStore(db, 'cache_metadata');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => reject(req.error);
  });
}