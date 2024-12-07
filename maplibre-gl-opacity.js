// デフォルトオプション設定
const defaultOptions = {
  baseLayers: null,
  overLayers: null,
  opacityControl: false,
};

class OpacityControl {
  #map;
  #container;
  #baseLayersOption;
  #overLayersOption;
  #opacityControlOption;

  constructor(options) {
    // オプション設定
    this.#baseLayersOption = options.baseLayers || defaultOptions.baseLayers;
    this.#overLayersOption = options.overLayers || defaultOptions.overLayers;
    this.#opacityControlOption = options.opacityControl || defaultOptions.opacityControl;
  }

  // ラジオボタン作成
  #radioButtonControlAdd(layerId) {
    // 初期レイヤ定義
    const initLayer = Object.keys(this.#baseLayersOption)[0];
    // ラジオボタン追加
    const radioButton = document.createElement("input");
    radioButton.setAttribute("type", "radio");
    radioButton.id = layerId;
    radioButton.name = "base-layer"; // ラジオボタンのグループ化

    // 初期レイヤのみ表示
    if (layerId === initLayer) {
      radioButton.checked = true;
      this.#map.setLayoutProperty(layerId, "visibility", "visible");
    } else {
      this.#map.setLayoutProperty(layerId, "visibility", "none");
    }
    this.#container.appendChild(radioButton);

    // ラジオボタンイベント
    radioButton.addEventListener("change", (event) => {
      if (event.target.checked) {
        // 選択レイヤ表示
        this.#map.setLayoutProperty(layerId, "visibility", "visible");
        // 選択レイヤ以外非表示
        Object.keys(this.#baseLayersOption).forEach((layer) => {
          if (layer !== layerId) {
            const otherRadioButton = document.getElementById(layer);
            if (otherRadioButton) {
              otherRadioButton.checked = false;
            }
            this.#map.setLayoutProperty(layer, "visibility", "none");
          }
        });
      }
    });

    // レイヤ名追加
    const layerName = document.createElement("label");
    layerName.htmlFor = layerId;
    layerName.appendChild(document.createTextNode(this.#baseLayersOption[layerId]));
    this.#container.appendChild(layerName);
  }

  // チェックボックス作成
  #checkBoxControlAdd(layerId, layerInfo) {
    // チェックボックス追加
    const checkBox = document.createElement("input");
    checkBox.setAttribute("type", "checkbox");
    checkBox.id = layerId;

    // 操作対象のレイヤーIDの配列を取得
    const layers = Array.isArray(layerInfo.layers) ? layerInfo.layers : [layerId];

    // レイヤーの現在の表示状態を確認
    let allVisible = layers.every((layer) => {
      const visibility = this.#map.getLayoutProperty(layer, "visibility");
      return visibility !== "none";
    });

    // チェックボックスの状態を設定
    checkBox.checked = allVisible;

    // チェックボックスをコントロールに追加
    this.#container.appendChild(checkBox);

    // チェックボックスイベント
    checkBox.addEventListener("change", (event) => {
      layers.forEach((layer) => {
        if (event.target.checked) {
          this.#map.setLayoutProperty(layer, "visibility", "visible");
        } else {
          this.#map.setLayoutProperty(layer, "visibility", "none");
        }
      });
    });

    // レイヤ名追加
    const layerName = document.createElement("label");
    layerName.htmlFor = layerId;
    layerName.appendChild(document.createTextNode(layerInfo.name || layerInfo));
    this.#container.appendChild(layerName);
  }

  // スライドバー作成
  #rangeControlAdd(layerId, layerInfo) {
    // 透過スライダーを追加するかどうかをデフォルトでtrueに設定
    const hasOpacitySlider = layerInfo.hasOpacitySlider !== false;

    if (!hasOpacitySlider) {
      return; // スライドバーを追加しない場合は処理を終了
    }

    // 透過度を調整するレイヤーIDの配列を取得
    let opacityLayers;
    if (layerInfo.opacityLayer) {
      // 特定のレイヤーのみ透過度を調整
      opacityLayers = Array.isArray(layerInfo.opacityLayer) ? layerInfo.opacityLayer : [layerInfo.opacityLayer];
    } else {
      // デフォルトでは、layerId自身を透過度調整
      opacityLayers = [layerId];
    }

    // 透過度の平均値を取得
    let opacities = opacityLayers.map((layerId) => {
      const layer = this.#map.getLayer(layerId);
      if (!layer) return 1;
      let opacityPropertyName;
      if (layer.type === "raster") {
        opacityPropertyName = "raster-opacity";
      } else if (layer.type === "fill") {
        opacityPropertyName = "fill-opacity";
      } else if (layer.type === "line") {
        opacityPropertyName = "line-opacity";
      } else if (layer.type === "circle") {
        opacityPropertyName = "circle-opacity";
      } else {
        return 1;
      }
      let opacity = this.#map.getPaintProperty(layerId, opacityPropertyName);
      return typeof opacity === "number" ? opacity : 1;
    });

    let averageOpacity = opacities.reduce((sum, value) => sum + value, 0) / opacities.length;

    // スライドバー追加
    const range = document.createElement("input");
    range.type = "range";
    range.min = 0;
    range.max = 100;
    range.value = averageOpacity * 100;
    this.#container.appendChild(range);

    // スライドバーイベント
    range.addEventListener("input", (event) => {
      const newOpacity = Number(event.target.value) / 100;
      opacityLayers.forEach((layerId) => {
        const layer = this.#map.getLayer(layerId);
        if (!layer) return;
        let opacityPropertyName;
        if (layer.type === "raster") {
          opacityPropertyName = "raster-opacity";
        } else if (layer.type === "fill") {
          opacityPropertyName = "fill-opacity";
        } else if (layer.type === "line") {
          opacityPropertyName = "line-opacity";
        } else if (layer.type === "circle") {
          opacityPropertyName = "circle-opacity";
        } else {
          return;
        }
        this.#map.setPaintProperty(layerId, opacityPropertyName, newOpacity);
      });
    });
  }

  // コントロール作成
  #opacityControlAdd() {
    // コントロール設定
    this.#container = document.createElement("div");
    this.#container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this.#container.id = "opacity-control";

    // ベースレイヤー設定
    if (this.#baseLayersOption) {
      Object.keys(this.#baseLayersOption).forEach((layerId) => {
        const br = document.createElement("br");
        // ラジオボタン作成
        this.#radioButtonControlAdd(layerId);
        this.#container.appendChild(br);
      });
    }

    // 区切り線
    if (this.#baseLayersOption && this.#overLayersOption) {
      const hr = document.createElement("hr");
      this.#container.appendChild(hr);
    }

    // オーバーレイヤ設定
    if (this.#overLayersOption) {
      Object.keys(this.#overLayersOption).forEach((layerId) => {
        const layerInfo = this.#overLayersOption[layerId];
        const br = document.createElement("br");
        // チェックボックス作成
        this.#checkBoxControlAdd(layerId, layerInfo);
        this.#container.appendChild(br);
        // スライドバー作成
        if (this.#opacityControlOption) {
          this.#rangeControlAdd(layerId, layerInfo);
          this.#container.appendChild(br);
        }
      });
    }
  }

  onAdd(map) {
    this.#map = map;
    // コントロール作成
    this.#opacityControlAdd();
    return this.#container;
  }

  onRemove() {
    this.#container.parentNode.removeChild(this.#container);
    this.#map = null;
  }
}
