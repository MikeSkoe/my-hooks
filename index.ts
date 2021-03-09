type GetSet<T> = [
    () => T,
    (update: (prev: T) => T) => void,
];

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
    let factoryIndex = 0;

    const cycle = () => {
        Object.keys(hooksFact).forEach(
            key => {
                if (!callKeys.includes(key)) {
                    hooksFact[key].callbacks.forEach(cb => cb());
                    hooksFact[key] = undefined;
                }
            },
        );
        factoryIndex = 0;
        callKeys = [];
    };

    const makeHooks = (
        str: string,
        callback?: () => void,
    ) => {
        hooksFact[str] = hooksFact[str] || {vals: [], hashs: [], callbacks: []};
        callKeys.push(str);

        const hooks = hooksFact[str];
        let index = 0;

        const useState = <T>(
            initialState: T,
        ): GetSet<T> => {
            // TODO: remove repetitions
            const pos = index++;
            const updateData = newData => {
                hooks.vals[pos] = newData;
                   //  update(getter());
                hooks.hashs[pos] = '';
                hooks.callbacks[pos] = NOP;
            }
            const getter = () => hooks.vals[pos];
            const setter = update => {
                updateData(update(getter()));
                // cycle();
                callback?.();
            };
            const isInitial = getter() === undefined;

            if (isInitial) {
                updateData(initialState);
            }

            return [getter, setter];
        };

        const useMemo = <T>(
            getState: () => T,
            hash: string,
        ) => {
            const pos = index++;
            const updateData = (newData, hash) => {
                hooks.vals[pos] = newData;
                hooks.hashs[pos] = hash;
                hooks.callbacks[pos] = NOP;
            }
            const getter = () => hooks.vals[pos];
            const hashGetter = () => hooks.hashs[pos];
            const isInitial = getter() === undefined;
            const hashChanged = hash !== hashGetter();

            if (isInitial || hashChanged) {
                updateData(getState(), hash);
            }

            return getter();
        }

        const useEffect = (
            effect: () => (() => void) | void,
            hash: string,
        ) => {
            const pos = index++;
            const getter = () => hooks.callbacks[pos];
            const hashGetter = () => hooks.hashs[pos];
            const isInitial = getter() === undefined;
            const hashChanged = hash !== hashGetter();

            if (isInitial || hashChanged) {
                hooks.vals[pos] = null;
                hooks.hashs[pos] = hash;
                hooks.callbacks[pos]?.();
                hooks.callbacks[pos] = effect() || NOP;
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
    const {useState, useMemo, useEffect} = makeHooks('Counter');
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
