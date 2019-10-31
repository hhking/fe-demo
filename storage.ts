/**
 * 简单 localStorage 调用封装
 * 统一前缀 `ls-`
 * 过期时间为 `number`, 默认单位 `min`
 * 暴露方法：
 * storage.set(key, val, expired?); expired 可选，不填则表示不过期 (注：过期设置对直接原生的 localStorage 调用无效)
 * storage.get(key);
 * storage.has(key);
 * storage.remove(key);
 * storage.supported(); 是否支持 localStorage
 */

const ls = window.localStorage;
const PREFIX: string = 'ls-';
const expiryMilliseconds: number = 1 * 60 * 1000; // 默认过期时间以 1 min 为单位
let isSupport: boolean;

function stringify(val: any) {
  // 处理特殊 val
  return val === undefined || typeof val === 'function' ? `${val}` : JSON.stringify(val);
}

function warn(error: Error) {
  if (!('console' in window) || typeof console.warn !== 'function') {
    return;
  }
  console.warn(error);
}

function lsKey(key: string) {
  return PREFIX + key;
}

function currentTime() {
  return new Date().getTime();
}

function getItem(key: string) {
  return ls.getItem(lsKey(key));
}

function setItem(key: string, value: any) {
  ls.removeItem(lsKey(key));
  ls.setItem(lsKey(key), value);
}

function removeItem(key: string) {
  ls.removeItem(lsKey(key));
}

function flushExpiredItem(key: string, time: number) {
  if (time) {
    // 过期则移除该项
    if (currentTime() >= time) {
      removeItem(key);
      return true;
    }
  }

  return false;
}

// 是否支持 localStorage
function supportStorage() {
  const key = '__lscachetest__';
  const value = key;

  if (isSupport !== undefined) {
    return isSupport;
  }

  try {
    if (!ls) {
      return false;
    }
  } catch (error) {
    return false;
  }

  try {
    setItem(key, value);
    removeItem(key);
    isSupport = true;
  } catch (error) {
    isSupport = false;
  }

  return isSupport;
}

const storage = {
  // 设置 localStorage, 过期时间 expired 单位 min
  set(key: string, val: any, expired?: number) {
    if (!supportStorage()) {
      return false;
    }
    const valArr = [val];
    let valStr: string;
    if (expired) {
      valArr.push(currentTime() + expired * expiryMilliseconds);
    }
    try {
      valStr = stringify(valArr);
    } catch (error) {
      warn(error);
      return false;
    }

    try {
      setItem(key, valStr);
    } catch (error) {
      warn(error);
      return false;
    }

    return true;
  },
  get(key: string) {
    if (!supportStorage()) {
      return null;
    }

    const val = getItem(key);
    try {
      const valArr = JSON.parse(val as string);
      const expire = valArr[1];
      // 获取前，检查是否过期，过期则返回 null
      if (flushExpiredItem(key, expire)) {
        return null;
      }
      return valArr[0];
    } catch (error) {
      return null;
    }
  },
  has(key: string) {
    return !!(this.get(key) !== null);
  },
  remove(key: string) {
    if (!supportStorage()) {
      return false;
    }
    removeItem(key);
    return true;
  },
  // 是否支持 localStorage
  supported() {
    return supportStorage();
  },
};

export default storage;
