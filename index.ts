const hooksFact = {};
let factoryIndex = 0;
let callKeys: string[] = [];

type GetSet<T> = [
    () => T,
    (update: (prev: T) => T) => void,
];

const cycle = () => {
    Object.keys(hooksFact).forEach(
        key => {
            if (!callKeys.includes(key)) {
                hooksFact[key] = undefined;
            }
        },
    );
    factoryIndex = 0;
    callKeys = [];
}

const makeHooks = (str: string) => {
    hooksFact[str] = hooksFact[str] || [];
    callKeys.push(str);

    const hooks = hooksFact[str];
    let index = 0;

    const useState = <T>(initialState: T): GetSet<T> => {
        const pos = index++;
        const getter = () => hooks[pos];
        const setter: GetSet<T>[1] = update => hooks[pos] = update(hooks[pos]);

        if (getter() === undefined) {
            setter(() => initialState);
        }

        return [getter, setter];
    };

    return {useState};
};

// -------

const Item = (item: number) => {
    const {useState} = makeHooks(`item-${item}`);
    const [getCounter, setCounter] = useState(1);

    setCounter(num => num + 1);

    return `${item}-${getCounter()}`;
}

const Component = (items: number[]) => {
    const {useState} = makeHooks('Counter');
    const [getCounter, setCounter] = useState(1);
    const [getICounter, setICounter] = useState(100);

    setCounter(num => num + 1);
    setICounter(num => num + 1);

    return {
        Counter: getCounter(),
        items: items.map(Item),
        ICounter: getICounter(),
    };
};

console.log(Component([1,2,3]));
cycle();
console.log(Component([2,3,4]));
cycle();
console.log(Component([1,2,5]));

