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
  ['FETCH_POSTS']: async ({ resolveWith, rejectWith }) => {
    const posts = await Typicode.posts;

    if (posts.error) {
      rejectWith(posts);
    } else {
      resolveWith({ posts });
    }
  },

  ['FETCH_USERS']: async ({ resolveWith, rejectWith }) => {
    const users = await Typicode.users;

    if (users.error) {
      rejectWith(users);
    } else {
      resolveWith({ users });
    }
  },

  ['FETCH_MODELS']: async (effect) => {
    const { action, resolveWith, rejectWith } = effect;
    const { models } = action.payload;

    if (!Array.isArray(models)) {
      rejectWith(
        `[${action.type}] Expected payload property 'models' to be an arry`
      );
    }

    const data = await Promise.all(models.map(
      model => Typicode[model].then(
        data => [model, data]
      )
    ));

    resolveWith(Object.fromEntries(data));
  },

  ['TEST_TIMEOUT']: () => {}
});
