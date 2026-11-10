// Tuti con vida: parpadea, sigue con la mirada al cursor y mueve las alas

const TutiVivo = (() => {
  const RUTA = "assets/tuti/vivo/";
  // Capas recortadas del dibujo de Figma; las medidas van en % del lienzo cuadrado
  const POSES = {
    saludo: {
      partes: {
        "cuerpo": {"src": "saludo-cuerpo.webp", "caja": [24.821, 14.464, 54.464, 83.214]},
        "ala": {"src": "saludo-ala.webp", "caja": [17.679, 34.464, 18.393, 25.179], "origen": [76.189, 84.501]},
        "ala-lado": {"src": "saludo-ala-lado.webp", "caja": [68.75, 57.857, 13.393, 25.179], "origen": [38.427, 34.519]},
        "puno": {"src": "saludo-puno.webp", "caja": [67.143, 56.607, 12.143, 18.393]},
        "copete": {"src": "saludo-copete.webp", "caja": [50.536, 2.321, 18.929, 18.214], "origen": [48.868, 77.557]},
      },
      ojos: [
        {
          caja: [41.071, 24.464, 11.071, 11.786],
          contorno: "polygon(98.5% 49.6%, 97.5% 52.6%, 97.6% 55.6%, 97.5% 58.7%, 96.7% 61.7%, 95.7% 64.6%, 94.9% 67.6%, 93.8% 70.6%, 92.9% 73.7%, 91.7% 76.8%, 90.0% 79.6%, 88.0% 82.3%, 86.0% 85.2%, 84.1% 88.4%, 81.4% 90.7%, 78.3% 92.6%, 75.2% 94.6%, 71.5% 95.2%, 67.9% 96.0%, 64.4% 97.0%, 60.8% 97.3%, 57.2% 97.7%, 53.6% 98.0%, 50.1% 97.1%, 46.5% 97.3%, 43.2% 95.6%, 40.1% 93.7%, 36.9% 92.9%, 33.5% 92.2%, 30.8% 90.1%, 27.4% 89.4%, 24.0% 88.3%, 20.9% 86.8%, 17.9% 84.9%, 15.7% 82.3%, 12.7% 80.4%, 10.5% 77.8%, 8.1% 75.2%, 6.7% 72.1%, 5.1% 69.1%, 5.0% 65.6%, 4.0% 62.5%, 1.4% 59.6%, 1.2% 56.3%, 2.2% 52.8%, 2.9% 49.6%, 3.0% 46.4%, 4.7% 43.4%, 5.7% 40.4%, 6.5% 37.4%, 8.4% 34.7%, 9.2% 31.7%, 10.2% 28.8%, 12.2% 26.3%, 14.0% 23.8%, 15.4% 20.8%, 17.9% 18.8%, 19.7% 16.1%, 22.0% 13.7%, 24.5% 11.5%, 27.2% 9.4%, 30.0% 7.5%, 32.7% 5.1%, 36.2% 4.3%, 39.5% 3.0%, 42.8% 1.5%, 46.3% 0.6%, 50.0% 0.8%, 53.6% 0.8%, 57.3% 0.6%, 61.0% 0.7%, 64.5% 1.8%, 68.2% 2.4%, 71.6% 3.5%, 74.8% 5.3%, 78.0% 6.9%, 81.1% 8.8%, 83.8% 11.1%, 86.0% 13.9%, 88.3% 16.5%, 90.6% 19.0%, 91.7% 22.3%, 93.3% 25.2%, 94.6% 28.2%, 95.7% 31.2%, 95.7% 34.6%, 97.6% 37.3%, 97.5% 40.5%, 97.6% 43.5%, 98.4% 46.5%)",
          abertura: "polygon(94.3% 49.6%, 93.3% 52.3%, 93.5% 55.1%, 93.4% 57.9%, 92.7% 60.6%, 91.7% 63.2%, 91.0% 66.0%, 90.1% 68.7%, 89.3% 71.6%, 88.3% 74.5%, 86.7% 77.1%, 84.6% 79.3%, 83.1% 82.2%, 82.0% 85.9%, 79.8% 88.6%, 76.7% 90.1%, 74.0% 92.2%, 70.5% 93.1%, 67.1% 93.8%, 63.8% 94.7%, 60.3% 95.0%, 57.0% 95.4%, 53.5% 95.6%, 50.1% 94.8%, 46.7% 95.0%, 43.6% 93.3%, 40.7% 91.5%, 37.6% 90.7%, 34.4% 90.0%, 31.9% 88.0%, 28.6% 87.4%, 25.4% 86.4%, 22.4% 84.9%, 19.6% 83.2%, 17.5% 80.7%, 14.6% 78.9%, 12.5% 76.4%, 10.2% 74.0%, 8.9% 71.0%, 7.4% 68.2%, 7.4% 64.8%, 6.6% 61.8%, 5.8% 58.8%, 6.6% 55.6%, 7.5% 52.5%, 8.6% 49.6%, 9.2% 46.8%, 10.9% 44.2%, 12.0% 41.6%, 12.7% 39.0%, 14.7% 36.9%, 15.6% 34.4%, 16.5% 31.9%, 18.7% 30.1%, 20.4% 28.1%, 22.0% 26.1%, 24.1% 24.4%, 25.8% 22.4%, 27.7% 20.5%, 30.1% 19.3%, 32.3% 17.9%, 34.6% 16.4%, 36.7% 14.5%, 39.5% 13.9%, 42.0% 12.6%, 44.7% 11.5%, 47.4% 10.3%, 50.4% 10.5%, 53.3% 10.0%, 56.3% 9.5%, 59.3% 9.6%, 62.3% 10.2%, 65.4% 10.3%, 68.3% 11.3%, 71.0% 12.6%, 74.0% 13.5%, 76.9% 14.7%, 79.4% 16.4%, 81.7% 18.4%, 83.6% 20.7%, 85.6% 23.0%, 87.4% 25.3%, 89.1% 27.7%, 90.5% 30.3%, 91.2% 33.1%, 91.3% 36.1%, 93.5% 38.4%, 93.4% 41.3%, 93.5% 44.1%, 94.2% 46.8%)",
          iris: {"src": "saludo-iris-izq.webp", "caja": [25.806, 21.212, 79.032, 83.333]},
          piel: "saludo-piel-izq.webp",
          parpado: {"top": -84.27, "alto": 184.27, "forma": "polygon(0.0% 0.0%, 100.0% 0.0%, 100.0% 73.2%, 95.2% 73.2%, 94.3% 73.2%, 91.6% 64.7%, 89.0% 62.0%, 86.4% 59.7%, 83.7% 58.0%, 81.1% 56.2%, 78.4% 55.3%, 75.8% 54.4%, 73.2% 53.5%, 70.5% 53.5%, 67.9% 52.6%, 65.3% 52.1%, 62.6% 52.1%, 60.0% 51.7%, 57.3% 51.7%, 54.7% 51.7%, 52.1% 52.1%, 49.4% 52.1%, 46.8% 52.6%, 44.1% 53.0%, 41.5% 53.5%, 38.9% 54.4%, 36.2% 54.8%, 33.6% 55.7%, 31.0% 56.6%, 28.3% 57.5%, 25.7% 58.8%, 23.0% 60.6%, 20.4% 62.0%, 17.8% 63.3%, 15.1% 66.5%, 12.5% 68.7%, 9.8% 71.4%, 7.2% 76.3%, 4.6% 78.1%, 0.0% 78.1%)", "piel_top": 45.732, "piel_alto": 54.268, "baja": "45.732%", "piel_sube": "-84.27%", "pestana": {"src": "saludo-pestana-izq.webp", "caja": [0.0, 44.91, 100.0, 37.001], "origen": [50.0, 14.645]}},
          feliz: {"alto": 187.575, "forma": "polygon(0.0% 31.4%, 4.6% 31.4%, 7.2% 29.6%, 9.8% 24.8%, 12.5% 22.1%, 15.1% 19.9%, 17.8% 16.8%, 20.4% 15.5%, 23.0% 14.2%, 25.7% 12.4%, 28.3% 11.1%, 31.0% 10.2%, 33.6% 9.4%, 36.2% 8.5%, 38.9% 8.0%, 41.5% 7.2%, 44.1% 6.7%, 46.8% 6.3%, 49.4% 5.8%, 52.1% 5.8%, 54.7% 5.4%, 57.3% 5.4%, 60.0% 5.4%, 62.6% 5.8%, 65.3% 5.8%, 67.9% 6.3%, 70.5% 7.2%, 73.2% 7.2%, 75.8% 8.0%, 78.4% 8.9%, 81.1% 9.8%, 83.7% 11.6%, 86.4% 13.3%, 89.0% 15.5%, 91.6% 18.2%, 94.3% 26.5%, 95.2% 26.5%, 100.0% 26.5%, 100.0% 100.0%, 0.0% 100.0%)", "piel_alto": 53.312, "baja": "46.688%", "piel_sube": "-87.575%"},
          centro: [48.279, 31.803],
        },
        {
          caja: [60.357, 28.571, 11.071, 11.786],
          contorno: "polygon(97.5% 50.7%, 97.8% 53.8%, 97.4% 56.9%, 96.9% 60.0%, 96.5% 63.1%, 95.9% 66.2%, 94.6% 69.2%, 93.9% 72.4%, 92.9% 75.7%, 91.7% 78.9%, 89.8% 81.8%, 88.0% 84.9%, 85.1% 87.0%, 83.4% 90.4%, 79.6% 91.5%, 76.5% 93.3%, 73.1% 94.6%, 69.5% 95.2%, 66.0% 95.9%, 62.6% 96.8%, 59.0% 97.1%, 55.5% 97.2%, 52.0% 97.0%, 48.6% 97.0%, 45.2% 96.3%, 41.7% 96.3%, 38.6% 94.8%, 35.2% 94.4%, 31.5% 94.4%, 28.1% 93.4%, 24.5% 92.6%, 21.5% 90.8%, 18.0% 89.5%, 15.2% 87.3%, 12.0% 85.4%, 9.5% 82.8%, 6.8% 80.3%, 5.1% 77.2%, 4.0% 73.8%, 3.2% 70.4%, 2.3% 67.1%, 2.0% 63.7%, 1.2% 60.5%, 1.9% 57.1%, 2.0% 53.8%, 1.9% 50.7%, 2.9% 47.5%, 2.8% 44.4%, 3.8% 41.4%, 4.6% 38.3%, 6.0% 35.5%, 7.7% 32.8%, 8.7% 29.9%, 10.3% 27.2%, 12.2% 24.6%, 13.2% 21.4%, 16.1% 19.6%, 17.9% 16.8%, 20.2% 14.5%, 22.7% 12.2%, 25.4% 10.2%, 27.9% 7.5%, 31.0% 5.8%, 34.3% 4.2%, 37.7% 3.3%, 41.2% 2.2%, 44.8% 1.3%, 48.5% 0.6%, 52.2% 0.6%, 55.9% 0.5%, 59.6% 1.4%, 63.1% 2.5%, 66.8% 3.0%, 70.3% 4.2%, 73.7% 5.7%, 76.7% 7.7%, 79.6% 9.8%, 82.3% 12.2%, 84.2% 15.3%, 87.1% 17.3%, 88.4% 20.6%, 90.6% 23.2%, 92.5% 25.9%, 93.9% 28.9%, 94.6% 32.1%, 95.9% 35.1%, 96.5% 38.2%, 96.9% 41.4%, 96.6% 44.6%, 97.8% 47.5%)",
          abertura: "polygon(89.7% 50.7%, 90.4% 53.3%, 90.9% 56.0%, 90.9% 58.8%, 90.4% 61.5%, 90.0% 64.2%, 89.1% 66.9%, 88.7% 69.9%, 88.2% 72.9%, 87.4% 76.0%, 86.1% 78.9%, 84.9% 82.0%, 83.2% 84.9%, 81.5% 88.2%, 78.1% 89.3%, 75.3% 91.3%, 72.0% 92.5%, 68.5% 93.0%, 65.2% 93.7%, 62.0% 94.6%, 58.6% 94.8%, 55.3% 94.9%, 52.0% 94.7%, 48.7% 94.7%, 45.5% 94.0%, 42.2% 94.0%, 39.2% 92.6%, 36.0% 92.2%, 32.4% 92.3%, 29.2% 91.4%, 25.8% 90.6%, 22.9% 88.9%, 19.6% 87.6%, 16.9% 85.5%, 13.7% 83.8%, 11.4% 81.4%, 8.8% 79.0%, 7.2% 76.0%, 6.2% 72.7%, 5.5% 69.4%, 4.6% 66.3%, 4.4% 63.0%, 3.9% 59.9%, 4.9% 56.7%, 5.3% 53.6%, 5.8% 50.7%, 7.1% 47.8%, 6.9% 44.9%, 7.9% 42.2%, 8.6% 39.4%, 10.0% 36.9%, 11.5% 34.4%, 12.4% 31.7%, 13.9% 29.3%, 15.6% 27.0%, 16.4% 24.0%, 19.1% 22.4%, 20.7% 19.8%, 23.0% 17.8%, 25.1% 15.5%, 27.7% 13.8%, 30.4% 12.3%, 33.4% 11.4%, 36.1% 9.7%, 39.3% 9.0%, 42.4% 8.5%, 45.5% 8.0%, 48.7% 7.9%, 51.9% 8.2%, 55.0% 8.5%, 58.0% 9.5%, 61.0% 10.5%, 64.0% 11.0%, 66.7% 12.6%, 69.2% 14.3%, 71.6% 16.0%, 74.0% 17.7%, 76.3% 19.4%, 77.8% 22.0%, 79.8% 23.9%, 80.8% 26.6%, 82.5% 28.7%, 84.1% 30.8%, 85.5% 33.1%, 86.2% 35.7%, 87.5% 38.0%, 88.2% 40.5%, 88.9% 43.0%, 88.8% 45.6%, 89.9% 48.1%)",
          iris: {"src": "saludo-iris-der.webp", "caja": [-11.29, 13.636, 83.871, 84.848]},
          piel: "saludo-piel-der.webp",
          parpado: {"top": -86.749, "alto": 186.749, "forma": "polygon(0.0% 0.0%, 100.0% 0.0%, 100.0% 77.5%, 94.2% 77.5%, 91.6% 79.2%, 88.9% 72.1%, 86.3% 67.3%, 83.7% 64.2%, 81.0% 61.5%, 78.4% 59.3%, 75.8% 57.5%, 73.1% 56.7%, 70.5% 55.3%, 67.8% 54.4%, 65.2% 53.6%, 62.6% 52.7%, 59.9% 52.2%, 57.3% 52.2%, 54.6% 51.8%, 52.0% 51.8%, 49.4% 51.4%, 46.7% 51.4%, 44.1% 51.4%, 41.5% 51.8%, 38.8% 52.2%, 36.2% 52.7%, 33.5% 53.1%, 30.9% 53.6%, 28.3% 54.4%, 25.6% 55.3%, 23.0% 56.7%, 20.3% 58.0%, 17.7% 59.8%, 15.1% 62.4%, 12.4% 65.1%, 9.8% 67.7%, 7.2% 73.0%, 4.5% 79.2%, 0.0% 79.2%)", "piel_top": 46.452, "piel_alto": 53.548, "baja": "46.452%", "piel_sube": "-86.749%", "pestana": {"src": "saludo-pestana-der.webp", "caja": [0.0, 44.829, 100.0, 38.133], "origen": [50.0, 12.459]}},
          feliz: {"alto": 188.401, "forma": "polygon(0.0% 32.0%, 4.5% 32.0%, 7.2% 25.9%, 9.8% 20.6%, 12.4% 18.0%, 15.1% 15.4%, 17.7% 12.7%, 20.3% 11.0%, 23.0% 9.7%, 25.6% 8.4%, 28.3% 7.5%, 30.9% 6.6%, 33.5% 6.2%, 36.2% 5.7%, 38.8% 5.3%, 41.5% 4.9%, 44.1% 4.4%, 46.7% 4.4%, 49.4% 4.4%, 52.0% 4.9%, 54.6% 4.9%, 57.3% 5.3%, 59.9% 5.3%, 62.6% 5.7%, 65.2% 6.6%, 67.8% 7.5%, 70.5% 8.4%, 73.1% 9.7%, 75.8% 10.6%, 78.4% 12.3%, 81.0% 14.5%, 83.7% 17.1%, 86.3% 20.2%, 88.9% 25.0%, 91.6% 32.0%, 94.2% 30.3%, 100.0% 30.3%, 100.0% 100.0%, 0.0% 100.0%)", "piel_alto": 53.078, "baja": "46.922%", "piel_sube": "-88.401%"},
          centro: [63.633, 35.131],
        },
      ],
    },
    cara: {
      partes: {
        "cuerpo": {"src": "../tuti-cara-chico.webp", "caja": [0, 0, 100, 100]},
      },
      ojos: [
        {
          caja: [22.5, 47.5, 21.875, 23.125],
          contorno: "polygon(97.8% 50.4%, 97.1% 54.9%, 96.8% 59.4%, 95.9% 64.0%, 94.2% 68.3%, 93.1% 73.0%, 91.1% 77.5%, 88.5% 81.8%, 85.4% 85.8%, 81.8% 89.7%, 77.8% 93.1%, 72.7% 95.1%, 67.5% 96.5%, 62.3% 97.5%, 57.0% 98.2%, 51.7% 97.7%, 46.4% 97.8%, 41.8% 94.2%, 36.9% 93.4%, 32.0% 92.1%, 27.5% 89.9%, 22.8% 88.0%, 18.2% 85.5%, 14.5% 82.0%, 10.9% 78.4%, 8.0% 74.2%, 5.6% 69.8%, 4.5% 64.9%, 1.9% 60.4%, 2.4% 55.3%, 3.4% 50.4%, 4.1% 45.6%, 6.2% 41.2%, 7.8% 36.9%, 9.6% 32.6%, 11.8% 28.6%, 14.4% 24.7%, 17.1% 20.9%, 20.0% 17.1%, 23.6% 13.8%, 27.3% 10.5%, 31.3% 7.2%, 36.2% 5.4%, 41.0% 2.9%, 46.3% 1.7%, 51.7% 1.8%, 57.1% 1.7%, 62.5% 2.1%, 67.8% 3.4%, 72.9% 5.3%, 77.6% 8.0%, 81.8% 11.1%, 85.4% 14.9%, 89.2% 18.4%, 91.1% 23.3%, 93.1% 27.8%, 95.0% 32.1%, 95.9% 36.8%, 96.8% 41.3%, 98.0% 45.8%)",
          piel: "cara-piel-izq.webp",
          parpado: {"top": -83.779, "alto": 183.779, "forma": "polygon(0.0% 0.0%, 100.0% 0.0%, 100.0% 73.6%, 94.5% 73.6%, 93.6% 73.6%, 91.0% 65.1%, 88.4% 62.4%, 85.8% 60.1%, 83.2% 58.4%, 80.6% 56.6%, 78.0% 55.7%, 75.4% 54.8%, 72.8% 53.9%, 70.1% 53.9%, 67.5% 53.0%, 64.9% 52.5%, 62.3% 52.5%, 59.7% 52.1%, 57.1% 52.1%, 54.5% 52.1%, 51.9% 52.5%, 49.3% 52.5%, 46.7% 53.0%, 44.1% 53.4%, 41.5% 53.9%, 38.9% 54.8%, 36.3% 55.2%, 33.7% 56.1%, 31.1% 57.0%, 28.5% 57.9%, 25.9% 59.3%, 23.3% 61.0%, 20.7% 62.4%, 18.1% 63.7%, 15.4% 66.9%, 12.8% 69.1%, 10.2% 71.8%, 7.6% 76.7%, 5.0% 78.5%, 0.0% 78.5%)", "piel_top": 45.587, "piel_alto": 54.413, "baja": "45.587%", "piel_sube": "-83.779%", "pestana": {"src": "cara-pestana-izq.webp", "caja": [-2.857, 42.646, 105.714, 41.178], "origen": [50.0, 19.711]}},
          centro: [36.672, 62.068],
        },
        {
          caja: [60.0, 55.625, 21.875, 23.125],
          contorno: "polygon(97.3% 51.0%, 97.5% 55.6%, 96.7% 60.2%, 95.4% 64.7%, 94.4% 69.4%, 93.7% 74.4%, 91.6% 79.0%, 89.2% 83.7%, 85.1% 87.0%, 81.9% 91.6%, 76.6% 93.4%, 71.6% 95.3%, 66.2% 96.0%, 61.0% 96.8%, 55.9% 97.2%, 50.7% 97.0%, 45.7% 96.4%, 40.6% 96.0%, 35.8% 94.4%, 30.4% 94.2%, 25.3% 92.7%, 20.8% 89.9%, 16.1% 87.3%, 11.6% 84.3%, 7.8% 80.5%, 5.2% 75.9%, 4.3% 70.5%, 3.2% 65.6%, 2.2% 60.7%, 3.2% 55.7%, 2.9% 51.0%, 4.0% 46.3%, 4.8% 41.7%, 6.5% 37.4%, 8.6% 33.2%, 10.4% 29.0%, 13.1% 25.1%, 15.5% 21.0%, 18.7% 17.3%, 22.4% 14.0%, 26.2% 10.7%, 30.0% 7.0%, 34.9% 4.8%, 40.0% 3.1%, 45.3% 1.9%, 50.7% 1.2%, 56.3% 1.1%, 61.8% 1.9%, 67.0% 3.6%, 72.1% 5.5%, 76.8% 8.2%, 80.9% 11.7%, 84.2% 15.8%, 87.9% 19.3%, 90.5% 23.6%, 92.5% 28.1%, 94.4% 32.6%, 95.4% 37.2%, 96.7% 41.7%, 97.0% 46.4%)",
          piel: "cara-piel-der.webp",
          parpado: {"top": -86.243, "alto": 186.243, "forma": "polygon(0.0% 0.0%, 100.0% 0.0%, 100.0% 77.5%, 94.1% 77.5%, 91.5% 79.3%, 88.9% 72.2%, 86.3% 67.4%, 83.7% 64.3%, 81.1% 61.7%, 78.5% 59.5%, 75.9% 57.7%, 73.2% 56.8%, 70.6% 55.5%, 68.0% 54.6%, 65.4% 53.7%, 62.8% 52.8%, 60.2% 52.4%, 57.6% 52.4%, 55.0% 52.0%, 52.4% 52.0%, 49.8% 51.5%, 47.2% 51.5%, 44.6% 51.5%, 42.0% 52.0%, 39.4% 52.4%, 36.8% 52.8%, 34.2% 53.3%, 31.6% 53.7%, 29.0% 54.6%, 26.4% 55.5%, 23.8% 56.8%, 21.1% 58.1%, 18.5% 59.9%, 15.9% 62.5%, 13.3% 65.2%, 10.7% 67.8%, 8.1% 73.1%, 5.5% 79.3%, 0.0% 79.3%)", "piel_top": 46.307, "piel_alto": 53.693, "baja": "46.307%", "piel_sube": "-86.243%", "pestana": {"src": "cara-pestana-der.webp", "caja": [-2.857, 43.404, 105.714, 39.182], "origen": [50.0, 16.19]}},
          centro: [66.622, 68.559],
        },
      ],
    },
  };
  const ORDEN = ["ala", "cuerpo", "copete", "ala-lado", "puno"];
  const CON_SOMBRA = new Set(["ala", "cuerpo"]);
  const vivos = new Set();
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  const punteroFino = window.matchMedia("(hover: hover) and (pointer: fine)");
  let puntero = null;
  let cuadroPendiente = false;

  /** Ubica un elemento con una caja [x, y, ancho, alto] en porcentajes. */
  function ubicar(el, [x, y, ancho, alto]) {
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.style.width = `${ancho}%`;
    el.style.height = `${alto}%`;
  }

  function imagen(src, clase) {
    const img = document.createElement("img");
    img.src = RUTA + src;
    img.alt = "";
    img.className = clase;
    img.decoding = "async";
    img.draggable = false;
    return img;
  }

  function elemento(clase) {
    const el = document.createElement("span");
    el.className = clase;
    return el;
  }

  /** Un ojo: el iris recortado por la abertura y los dos párpados con su piel quieta. */
  function armarOjo(ojo) {
    const caja = elemento("tv-ojo");
    ubicar(caja, ojo.caja);
    caja.style.clipPath = ojo.contorno;
    caja.style.setProperty("--tv-cierra", ojo.parpado.baja);
    caja.style.setProperty("--tv-piel-cierra", ojo.parpado.piel_sube);

    if (ojo.iris) {
      const abertura = elemento("tv-abertura");
      abertura.style.clipPath = ojo.abertura;
      const iris = imagen(ojo.iris.src, "tv-iris");
      ubicar(iris, ojo.iris.caja);
      abertura.appendChild(iris);
      caja.appendChild(abertura);
    }

    if (ojo.feliz) {
      caja.style.setProperty("--tv-feliz", ojo.feliz.baja);
      caja.style.setProperty("--tv-piel-feliz", ojo.feliz.piel_sube);
      const feliz = elemento("tv-feliz");
      feliz.style.height = `${ojo.feliz.alto}%`;
      feliz.style.clipPath = ojo.feliz.forma;
      const pielFeliz = imagen(ojo.piel, "tv-piel");
      pielFeliz.style.height = `${ojo.feliz.piel_alto}%`;
      feliz.appendChild(pielFeliz);
      caja.appendChild(feliz);
    }

    const parpado = elemento("tv-parpado");
    parpado.style.top = `${ojo.parpado.top}%`;
    parpado.style.height = `${ojo.parpado.alto}%`;
    parpado.style.clipPath = ojo.parpado.forma;
    const pielParpado = imagen(ojo.piel, "tv-piel");
    pielParpado.style.top = `${ojo.parpado.piel_top}%`;
    pielParpado.style.height = `${ojo.parpado.piel_alto}%`;
    const pestana = imagen(ojo.parpado.pestana.src, "tv-pestana");
    ubicar(pestana, ojo.parpado.pestana.caja);
    pestana.style.transformOrigin = `${ojo.parpado.pestana.origen[0]}% ${ojo.parpado.pestana.origen[1]}%`;
    parpado.append(pielParpado, pestana);

    caja.appendChild(parpado);
    return caja;
  }

  /** Arma a Tuti por capas con las mismas clases de la imagen que reemplaza. */
  function armar(img, pose) {
    const datos = POSES[pose];
    const clases = [...img.classList].filter((c) => c !== "tuti-saluda" && c !== "tuti-salta");
    const raiz = elemento(["tuti-vivo", ...clases].join(" "));
    if (img.alt) {
      raiz.setAttribute("role", "img");
      raiz.setAttribute("aria-label", img.alt);
    } else {
      raiz.setAttribute("aria-hidden", "true");
    }
    ORDEN.forEach((nombre) => {
      const parte = datos.partes[nombre];
      if (!parte) return;
      const capa = imagen(parte.src, `tv-parte tv-${nombre}${CON_SOMBRA.has(nombre) ? " tv-sombra" : ""}`);
      ubicar(capa, parte.caja);
      if (parte.origen) capa.style.transformOrigin = `${parte.origen[0]}% ${parte.origen[1]}%`;
      raiz.appendChild(capa);
    });
    const centros = datos.ojos.map((ojo) => {
      raiz.appendChild(armarOjo(ojo));
      return ojo.centro;
    });
    raiz.centroOjos = [(centros[0][0] + centros[1][0]) / 2, (centros[0][1] + centros[1][1]) / 2];
    return raiz;
  }

  function azar(min, max) {
    return min + Math.random() * (max - min);
  }

  /** Cada Tuti lleva su propio reloj de parpadeos, miradas y saludos. */
  function crearControl(raiz) {
    const control = { raiz, visible: false, temporizadores: {}, ultimoMovimiento: 0 };

    function programar(nombre, ms, fn) {
      clearTimeout(control.temporizadores[nombre]);
      control.temporizadores[nombre] = setTimeout(fn, ms);
    }

    function claseUnRato(clase, ms) {
      raiz.classList.remove(clase);
      void raiz.offsetWidth;
      raiz.classList.add(clase);
      programar(clase, ms, () => raiz.classList.remove(clase));
    }

    control.parpadear = () => {
      claseUnRato("parpadea", 230);
      // A veces parpadea dos veces seguidas, como una persona
      if (Math.random() < 0.18) programar("doble", 300, () => claseUnRato("parpadea", 230));
    };

    control.mirar = (x, y) => {
      raiz.style.setProperty("--tv-mx", x.toFixed(3));
      raiz.style.setProperty("--tv-my", y.toFixed(3));
    };

    control.saludar = () => claseUnRato("saluda", 1500);

    control.alAparecer = () => {
      if (raiz.querySelector(".tv-ala") && !movimientoReducido.matches) control.saludar();
      else control.parpadear();
    };

    control.celebrar = () => {
      raiz.classList.add("feliz");
      claseUnRato("celebra", 2400);
      programar("feliz", 2300, () => raiz.classList.remove("feliz"));
    };

    function cicloParpadeo() {
      programar("parpadeo", azar(2600, 5600), () => {
        if (control.visible && !raiz.classList.contains("feliz")) control.parpadear();
        cicloParpadeo();
      });
    }

    function cicloMirada() {
      programar("mirada", azar(2400, 5200), () => {
        const quieto = performance.now() - control.ultimoMovimiento > 3500;
        if (control.visible && quieto && !movimientoReducido.matches) {
          // Mira a un lado un momento y vuelve al centro
          control.mirar(azar(-0.9, 0.9), azar(-0.6, 0.5));
          programar("vuelve", azar(700, 1500), () => control.mirar(0, 0));
        }
        cicloMirada();
      });
    }

    function cicloSaludo() {
      programar("saludo", azar(11000, 18000), () => {
        if (control.visible && !movimientoReducido.matches) control.saludar();
        cicloSaludo();
      });
    }

    control.empezar = () => {
      cicloParpadeo();
      cicloMirada();
      cicloSaludo();
    };

    raiz.addEventListener("pointerdown", () => {
      control.saludar();
      control.parpadear();
    });
    return control;
  }

  /** La mirada sigue al cursor (o al dedo cuando toca la pantalla). */
  function seguirPuntero() {
    cuadroPendiente = false;
    if (!puntero) return;
    vivos.forEach((control) => {
      if (!control.visible) return;
      const caja = control.raiz.getBoundingClientRect();
      if (!caja.width) return;
      const cx = caja.left + (caja.width * control.raiz.centroOjos[0]) / 100;
      const cy = caja.top + (caja.height * control.raiz.centroOjos[1]) / 100;
      const dx = puntero.x - cx;
      const dy = puntero.y - cy;
      const distancia = Math.hypot(dx, dy) || 1;
      const fuerza = distancia / (distancia + caja.width * 0.7);
      control.mirar((dx / distancia) * fuerza, (dy / distancia) * fuerza);
      control.ultimoMovimiento = performance.now();
      clearTimeout(control.temporizadores.vuelve);
      control.temporizadores.vuelve = setTimeout(() => control.mirar(0, 0), 3500);
    });
  }

  function alMoverPuntero(e) {
    if (movimientoReducido.matches) return;
    if (e.pointerType === "mouse" && !punteroFino.matches) return;
    puntero = { x: e.clientX, y: e.clientY };
    if (!cuadroPendiente) {
      cuadroPendiente = true;
      requestAnimationFrame(seguirPuntero);
    }
  }

  // Al aparecer en pantalla saluda (o parpadea, si es solo la cara); escondido no gasta nada
  const observador = "IntersectionObserver" in window
    ? new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
          vivos.forEach((control) => {
            if (control.raiz !== entrada.target) return;
            const antes = control.visible;
            control.visible = entrada.isIntersecting && !document.hidden;
            if (!antes && control.visible) {
              clearTimeout(control.temporizadores.aparece);
              control.temporizadores.aparece = setTimeout(control.alAparecer, 450);
            }
          });
        });
      })
    : null;

  // Al volver a la pestaña se vuelve a medir si cada Tuti está a la vista
  document.addEventListener("visibilitychange", () => {
    vivos.forEach((control) => {
      if (document.hidden) control.visible = false;
      else if (observador) {
        observador.unobserve(control.raiz);
        observador.observe(control.raiz);
      } else control.visible = true;
    });
  });

  /** Cambia la imagen fija por Tuti animado cuando todas sus capas ya cargaron. */
  function montar(img, pose = "saludo") {
    if (!img || img.tutiVivo || !POSES[pose]) return Promise.resolve(null);
    img.tutiVivo = true;
    const raiz = armar(img, pose);
    const capas = [...raiz.querySelectorAll("img")];
    const listas = capas.map((c) => (c.decode ? c.decode().catch(() => null) : Promise.resolve()));
    return Promise.all(listas).then(() => {
      if (capas.some((c) => !c.naturalWidth) || !img.isConnected) return null;
      img.replaceWith(raiz);
      const control = crearControl(raiz);
      raiz.tuti = control;
      vivos.add(control);
      if (observador) observador.observe(raiz);
      else control.visible = true;
      control.empezar();
      return control;
    });
  }

  /** Busca el Tuti vivo dentro de un contenedor y le pide un gesto. */
  function gesto(selector, nombre) {
    const raiz = document.querySelector(`${selector} .tuti-vivo, ${selector}.tuti-vivo`);
    if (!raiz || !raiz.tuti) return false;
    if (nombre === "celebrar") raiz.tuti.celebrar();
    else raiz.tuti.saludar();
    return true;
  }

  document.addEventListener("pointermove", alMoverPuntero, { passive: true });
  document.addEventListener("pointerdown", alMoverPuntero, { passive: true });

  return { montar, gesto };
})();
