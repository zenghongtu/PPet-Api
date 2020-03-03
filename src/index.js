const path = require('path');
const Koa = require('koa');
const _ = require('koa-route');
const app = (module.exports = new Koa());

app.use(async function(ctx, next) {
  try {
    await next();
  } catch (err) {
    err.message = `<p> <b>${err.message}</b> <br/><br/> please contact JasonZeng<zenghongtu@gmail.com>.</p>`;

    ctx.app.emit('error', err, ctx);
  }
});

const parseQuery = ctx => {
  const { id } = ctx.query;
  if (!id) {
    const err = new Error('缺少参数');
    err.status = 400;
    throw err;
  }

  return id.split('-').map(item => +item);
};

const { models, messages } = require('../assets/model_list.json');

const ppetRoute = {
  model: ctx => {
    ctx.status = 301;
    ctx.redirect(`http://ppet-assets-0.zenghongtu.com${ctx.path}`);
  },
  get: ctx => {
    const [modelId, textureId] = parseQuery(ctx);

    let model = models[modelId];
    let modelJSON;

    if (!model) {
      return ctx.app.emit('error', { status: 400, message: '参数错误' }, ctx);
    } else if (Array.isArray(model)) {
      const texture = (model = model[textureId]);

      if (texture) {
        modelJSON = require(`../assets/model/${texture}/index.json`);
      }
    } else if (textureId === 0) {
      modelJSON = require(`../assets/model/${model}/index.json`);
    } else {
      modelJSON = require(`../assets/model/${model}/index.json`);
      const _textures = require(`../assets/model/${model}/textures.cache.json`);

      if (_textures) {
        modelJSON = { ...modelJSON, textures: [].concat(_textures[textureId]) };
      }
    }

    const prePath = `../model/${model}`;

    modelJSON = JSON.parse(
      JSON.stringify(modelJSON).replace(/motions\//gi, `${prePath}/motions/`)
    );

    modelJSON['model'] = `${prePath}/${modelJSON.model}`;

    if (modelJSON.pose) {
      modelJSON.pose = `${prePath}/${modelJSON.pose}`;
    }

    if (modelJSON.physics) {
      modelJSON.physics = `${prePath}/${modelJSON.physics}`;
    }

    if (modelJSON.textures) {
      modelJSON.textures = modelJSON.textures.map(item => `${prePath}/${item}`);
    }

    if (modelJSON.expressions) {
      modelJSON.expressions = modelJSON.expressions.map(
        item => ((item.file = `${prePath}/${item.file}`), item)
      );
    }

    ctx.body = modelJSON;
  },
  switch: ctx => {
    const [modelId, textureId] = parseQuery(ctx);

    let nextModelId;
    if (modelId < models.length - 1) {
      nextModelId = modelId + 1;
    } else {
      nextModelId = 0;
    }

    ctx.body = {
      model: {
        id: nextModelId,
        message: messages[nextModelId]
      }
    };
  },
  switch_textures: ctx => {
    const [modelId, textureId] = parseQuery(ctx);

    const model = models[modelId];

    let nextTextureId;

    if (!model) {
      return ctx.app.emit('error', { status: 400, message: '缺少参数' }, ctx);
    } else if (Array.isArray(model)) {
      if (textureId < model.length - 1) {
        nextTextureId = textureId + 1;
      } else {
        nextTextureId = 0;
      }
    } else {
      const _textures = require(`../assets/model/${model}/textures.cache.json`);

      if (_textures && textureId < _textures.length - 1) {
        nextTextureId = textureId + 1;
      } else {
        nextTextureId = 0;
      }
    }

    ctx.body = {
      textures: { id: nextTextureId }
    };
  }
};

const home = ctx => {
  ctx.body = 'PPet Api';
};

app.use(async (ctx, next) => {
  await next();
  // TODO
  ctx.set('Cache-Control', `public, max-age=${2 * 24 * 60 * 60}`);
});

app.use(_.get('/get', ppetRoute.get));
app.use(_.get('/model/*', ppetRoute.model));
app.use(_.get('/switch', ppetRoute.switch));
app.use(_.get('/switch_textures', ppetRoute.switch_textures));
app.use(_.get('/', home));

app.on('error', function(err, ctx) {
  if (process.env.NODE_ENV != 'test') {
    console.log('sent error %s to the server', err.message);
    console.log(err);
  }

  ctx.status = err.status || 500;
  ctx.body = err.message;
});

if (!module.parent) app.listen(3000);
