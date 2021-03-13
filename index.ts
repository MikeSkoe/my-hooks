type HooksHolder = {
    vals: any[],
    hashs: string[],
    callbacks: (() => void)[],
}

const NOP = () => void 0;

// TODO: take middlewares
const initHooks = () => {
    const hooksFact: {[key: string]: HooksHolder} = {};
    let callKeys: string[] = [];

    const cycle = () => {
        Object.keys(hooksFact).forEach(
            key => {
                if (!callKeys.includes(key)) {
                    hooksFact[key].callbacks.forEach(cb => cb());
                    hooksFact[key] = undefined;
                }
            },
        );
        callKeys = [];
    };

    const makeHooks = (
        str: string,
    ) => {
        hooksFact[str] = hooksFact[str] || {vals: [], hashs: [], callbacks: []};
        callKeys.push(str);

        const hooks = hooksFact[str];
        let index = 0;

        const getPosAndUpdate = (): {
            valGetter: () => any;
            hashGetter: () => any;
            callbackGetter: () => any;
            updateData: (val: any, hash: string, callback: () => void) => void,
        } => {
            const pos = index++;
            const valGetter = () => hooks.vals[pos];
            const hashGetter = () => hooks.hashs[pos];
            const callbackGetter = () => hooks.callbacks[pos];
            const updateData = (val: any, hash: string, callback: () => void) => {
                hooks.vals[pos] = val;
                hooks.hashs[pos] = hash;
                hooks.callbacks[pos]?.();
                hooks.callbacks[pos] = callback;
            }

            return {
                valGetter,
                hashGetter,
                callbackGetter,
                updateData,
            };
        }

        const useState = <T>(
            initialState: T,
        ): [() => T, (update: (prev: T) => T) => void] => {
            // TODO: remove repetitions
            const {updateData, valGetter} = getPosAndUpdate();
            const setter = (update: (prev: T) => T) => {
                updateData(update(valGetter()), '', NOP);
            };
            const isInitial = valGetter() === undefined;

            if (isInitial) {
                updateData(initialState, '', NOP);
            }

            return [valGetter, setter];
        };

        const useMemo = <T>(
            getState: () => T,
            hash: string,
        ): T => {
            const {updateData, valGetter, hashGetter} = getPosAndUpdate();
            const isInitial = valGetter() === undefined;
            const hashChanged = hash !== hashGetter();

            if (isInitial || hashChanged) {
                updateData(getState(), hash, NOP);
            }

            return valGetter();
        }

        const useEffect = (
            effect: () => (() => void) | void,
            hash: string,
        ) => {
            const {updateData, valGetter, hashGetter} = getPosAndUpdate();
            const isInitial = valGetter() === undefined;
            const hashChanged = hash !== hashGetter();

            if (isInitial || hashChanged) {
                updateData(null, hash, effect() || NOP);
            }
        }

        return {useState, useMemo, useEffect};
    };

    return {cycle, makeHooks}
}

// -------

const {cycle, makeHooks} = initHooks();

const Item = (item: number) => {
    const {useState, useEffect} = makeHooks(`item-${item}`);
    const [getCounter, setCounter] = useState(1);

    setCounter(num => num + 1);
    useEffect(
        () => {
            console.log(`item ${item} born`);

            return () => console.log(`item ${item} unsub`);
        },
        '',
    );

    return `${item}-${getCounter()}`;
}

const Component = (items: number[]) => {
    const {useState, useMemo} = makeHooks('Counter');
    const [getCounter, setCounter] = useState(1);
    const [getICounter, setICounter] = useState(100);

    const test = useMemo(
        Math.random,
        items.length.toString(),
    );

    setCounter(num => num + 1);
    setICounter(num => num + 1);

    return {
        random: test,
        Counter: getCounter(),
        items: items.map(Item),
        ICounter: getICounter(),
    };
};

console.log(Component([1,2,3]));
cycle();
console.log(Component([2,3,4]));
cycle();
console.log(Component([1,2,5,6]));
cycle();
console.log(Component([1,2,5,8]));
