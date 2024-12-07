function makeNumPngProtocol(protocol = "numpng", factor = 0.01, invalidValue = -(2 ** 23)) {
  return (params) => {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.crossOrigin = "anonymous";

      // 画像が正常に読み込まれた場合の処理
      image.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // ピクセルデータを変換
          for (let i = 0; i < imageData.data.length; i += 4) {
            const [r, g, b, a] = imageData.data.slice(i, i + 4);
            const r2 = r < 128 ? r : r - 256;
            const n = r2 * 65536 + g * 256 + b;
            const height = n === invalidValue || a !== 255 ? 0 : factor * n;
            const n2 = (height + 10000) * 10;

            imageData.data.set([0xff & (n2 >> 16), 0xff & (n2 >> 8), 0xff & n2, 255], i);
          }
          ctx.putImageData(imageData, 0, 0);

          // Blobを生成し、データを解決
          canvas.toBlob(async (blob) => {
            if (blob) {
              const arrayBuffer = await blob.arrayBuffer();
              resolve({ data: arrayBuffer });
            } else {
              reject(new Error("Failed to generate blob"));
            }
          });
        } catch (error) {
          reject(error);
        }
      };

      // 画像の読み込みエラー時の処理
      image.onerror = function () {
        reject(new Error(`Failed to load image from URL: ${params.url}`));
      };

      // 画像のURLを設定
      image.src = params.url.replace(protocol + "://", "https://");
    });
  };
}
