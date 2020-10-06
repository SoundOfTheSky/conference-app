const Utils = {
  fileToBase64: file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    }),
  getCookie: name => {
    const start = document.cookie.indexOf(`${name}=`) + name.length + 1;
    const end = document.cookie.indexOf(';', start);
    if (start !== -1) return document.cookie.substring(start, end === -1 ? undefined : end);
  },
  setCookie: (name, value) => {
    document.cookie = name + '=' + value;
  },
};
export default Utils;
