self.importScripts('./MessageTarget.js');

const PATHS = {};

const Typicode = new Proxy(PATHS, {
  get(target, name, something) {
    const path = target[name] || name;
    const url = new URL(path, 'https://jsonplaceholder.typicode.com');
    return fetch(url).then(response => response.json());
  }
});

MessageTarget(self, {
  ['FETCH_POSTS']: async ({ resolveWith }) => {
    const posts = await Typicode.posts;
    resolveWith({ posts });
  },

  ['FETCH_USERS']: async ({ resolveWith }) => {
    const users = await Typicode.users;
    resolveWith({ users });
  },

  ['TEST_TIMEOUT']: () => {}
});
