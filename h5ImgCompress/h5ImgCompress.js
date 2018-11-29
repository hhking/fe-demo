import EXIF from 'exif-js';
import './toBlobPolyfill';

// 默认参数
const defaultOpts = {
  result: 'base64', // 返回的结果类型 base64/blob
  fix: true, // 是否使用 EXIF 校正图片的方向, 如果传入的是 base64 则无效
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 90,
};

const file2base64 = file => {
  const fr = new FileReader();

  return new Promise((res, rej) => {
    fr.onload = e => {
      res(e.target.result);
    };
    fr.onerror = e => {
      rej(e);
    };
    fr.readAsDataURL(file);
  });
};

const compress = (dataUrl, opts) =>
  new Promise((res, rej) => {
    const image = new Image();

    image.onload = () => {
      let degree = 0;
      let maxWidth = opts.maxWidth;
      let maxHeight = opts.maxHeight;
      let cvs = document.createElement('canvas');
      let imgWidth = image.width;
      let imgHeight = image.height;
      let scale = imgWidth / imgHeight;

      if (imgWidth > 0 && imgHeight > 0) {
        if (scale >= maxWidth / maxHeight) {
          if (imgWidth > maxWidth) {
            imgHeight = maxWidth / scale;
            imgWidth = maxWidth;
          }
        } else if (imgHeight > maxHeight) {
          imgWidth = maxHeight * scale;
          imgHeight = maxHeight;
        }
      }

      let ctx = cvs.getContext('2d');
      cvs.width = imgWidth;
      cvs.height = imgHeight;
      // 判断图片方向，重置canvas大小，确定旋转角度，iPhone 默认的是home键在右方的横屏拍摄方式
      switch (opts.orientation) {
        // iPhone横屏拍摄，此时home键在左侧
        case 3:
          degree = 180;
          imgWidth = -imgWidth;
          imgHeight = -imgHeight;
          break;
          // iPhone竖屏拍摄，此时home键在下方(正常拿手机的方向)
        case 6:
          // 旋转角度
          degree = 90;
          // 调整画布大小
          cvs.width = imgHeight;
          cvs.height = imgWidth;
          // 修改绘画位置
          imgHeight = -imgHeight;
          break;
          // iPhone竖屏拍摄，此时home键在上方
        case 8:
          degree = 270;
          cvs.width = imgHeight;
          cvs.height = imgWidth;
          imgWidth = -imgWidth;
          break;
      }
      // 使用canvas旋转校正
      ctx.rotate((degree * Math.PI) / 180);
      // 将图片绘制到Canvas上，从原点0,0绘制到 imgWidth, imgHeight
      ctx.drawImage(image, 0, 0, imgWidth, imgHeight);

      // callback
      if (opts.result !== 'base64') {
        cvs.toBlob(
          blob => {
            res(blob);
          },
          opts.mimeType,
          opts.quality / 100
        );
      } else {
        const data = cvs.toDataURL(opts.mimeType, opts.quality / 100);
        res(data);
      }
      cvs = ctx = null;
    };
    image.src = dataUrl;
  });

const compressImg = (file, opts = {}) => {
  if (!file) {
    console.warn('file is null');
    return;
  }

  opts = Object.assign({}, defaultOpts, opts);

  return new Promise((res, rej) => {
    if (opts.fix) {
      // 获取图片方向－－iOS拍照下有值
      EXIF.getData(file, function() {
        opts.orientation = EXIF.getTag(this, 'Orientation');
      });
      console.log('orientation', opts.orientation);
    }

    opts.mimeType = file.type;
    file2base64(file).then(data => {
      compress(data, opts).then(result => {
        res(result);
      });
    });
  });
};

export default compressImg;
export { file2base64 };