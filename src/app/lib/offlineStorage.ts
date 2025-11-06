// IndexedDB utility for offline data persistence

const DB_NAME = 'UnilinkOfflineDB';
const DB_VERSION = 1;
const STORES = {
  MY_RIDES: 'myRides',
  MY_REQUESTS: 'myRequests',
  USER_DATA: 'userData'
};

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.MY_RIDES)) {
        db.createObjectStore(STORES.MY_RIDES, { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains(STORES.MY_REQUESTS)) {
        db.createObjectStore(STORES.MY_REQUESTS, { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
      }
    };
  });
}

// Save rides offered by the user
export async function saveMyRides(rides: any[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.MY_RIDES], 'readwrite');
    const store = transaction.objectStore(STORES.MY_RIDES);

    // Clear existing data
    store.clear();

    // Add new rides
    rides.forEach(ride => {
      store.add(ride);
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving rides to IndexedDB:', error);
    throw error;
  }
}

// Get saved rides
export async function getMyRides(): Promise<any[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.MY_RIDES], 'readonly');
    const store = transaction.objectStore(STORES.MY_RIDES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting rides from IndexedDB:', error);
    return [];
  }
}

// Save ride requests by the user
export async function saveMyRequests(requests: any[]): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.MY_REQUESTS], 'readwrite');
    const store = transaction.objectStore(STORES.MY_REQUESTS);

    // Clear existing data
    store.clear();

    // Add new requests
    requests.forEach(request => {
      store.add(request);
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving requests to IndexedDB:', error);
    throw error;
  }
}

// Get saved requests
export async function getMyRequests(): Promise<any[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.MY_REQUESTS], 'readonly');
    const store = transaction.objectStore(STORES.MY_REQUESTS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting requests from IndexedDB:', error);
    return [];
  }
}

// Save user ID for filtering
export async function saveUserId(userId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.USER_DATA], 'readwrite');
    const store = transaction.objectStore(STORES.USER_DATA);

    store.put({ key: 'currentUserId', value: userId });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Error saving user ID to IndexedDB:', error);
    throw error;
  }
}

// Get saved user ID
export async function getUserId(): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORES.USER_DATA], 'readonly');
    const store = transaction.objectStore(STORES.USER_DATA);
    const request = store.get('currentUserId');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting user ID from IndexedDB:', error);
    return null;
  }
}
