export default class Extras {

    static fslw(n) {
        return 0.15 * n
    }
    
    static worldCenter(x, y) {
        return {
            x: x + window.innerWidth / 2,
            y: -y + window.innerHeight / 2
        };
    }


    static pxToNum(str) {
        if (typeof str !== 'string') return NaN;
        return parseFloat(str.replace('px', ''));
    }

}