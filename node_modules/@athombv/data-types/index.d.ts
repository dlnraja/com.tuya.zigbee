type ToBuffer = (buffer: Buffer, value: unknown, index: number) => Buffer;
type FromBuffer = (buffer: Buffer, index: number, returnLength: boolean) => unknown;

declare module "@athombv/data-types" {  
  interface DataTypeInterface {
    id: number;
    shortName: string;
    length: number;
    toBuffer: ToBuffer;
    fromBuffer: FromBuffer;
    args: unknown[];
    defaultValue: unknown;
  
    isAnalog: () => boolean;
    inspect: () => string;
  }
  
  interface DataTypeConstructor {
    new (
      id: number,
      shortName: string,
      length: number,
      toBuf: ToBuffer,
      fromBuf: FromBuffer,
      ...args: unknown[]
    ): DataTypeInterface;
  }
  
  interface DataTypeFunctionConstructor {
    (...args: unknown[]): DataTypeConstructor;
  }
  
  type DataTypeItem =
    | DataTypeConstructor
    | DataTypeFunctionConstructor
    | { [name: string]: DataTypeItem }; // This OR is needed for Structs with a second level of DataTypes
  
  type GenericMap<T> = {
    [K in keyof T]: DataTypeItem;
  };
  
  interface StructTypeInterface<T> {
    toJSON: () => T;
    toBuffer: (buffer?: Buffer, index?: number) => Buffer;
  }
  
  export interface StructInstance<StructType> {
    fromBuffer: (buffer: Buffer) => StructType & StructTypeInterface<StructType>;
    toBuffer: (buffer: Buffer, object: StructType, index?: number) => Buffer;
    fields: GenericMap<StructType>;
    name: string;
    length: number;
    fromJSON: (object: StructType) => StructType & StructTypeInterface<StructType>;
    fromArgs: (...args: unknown[]) => StructType & StructTypeInterface<StructType>;
  }
  export const DataTypes: {
    noData: DataTypeConstructor;
    data8: DataTypeConstructor;
    data16: DataTypeConstructor;
    data24: DataTypeConstructor;
    data32: DataTypeConstructor;
    data40: DataTypeConstructor;
    data48: DataTypeConstructor;
    data56: DataTypeConstructor;
    data64: DataTypeConstructor;
    bool: DataTypeConstructor;
    map8: DataTypeFunctionConstructor;
    map16: DataTypeFunctionConstructor;
    map24: DataTypeFunctionConstructor;
    map32: DataTypeFunctionConstructor;
    map40: DataTypeFunctionConstructor;
    map48: DataTypeFunctionConstructor;
    map56: DataTypeFunctionConstructor;
    map64: DataTypeFunctionConstructor;
    uint8: DataTypeConstructor;
    uint16: DataTypeConstructor;
    uint24: DataTypeConstructor;
    uint32: DataTypeConstructor;
    uint40: DataTypeConstructor;
    uint48: DataTypeConstructor;
    int8: DataTypeConstructor;
    int16: DataTypeConstructor;
    int24: DataTypeConstructor;
    int32: DataTypeConstructor;
    int40: DataTypeConstructor;
    int48: DataTypeConstructor;
    enum8: DataTypeFunctionConstructor;
    enum16: DataTypeFunctionConstructor;
    enum32: DataTypeFunctionConstructor;
    single: DataTypeConstructor;
    double: DataTypeConstructor;
    octstr: DataTypeConstructor;
    string: DataTypeConstructor;
    EUI48: DataTypeConstructor;
    EUI64: DataTypeConstructor;
    key128: DataTypeConstructor;
    uint4: DataTypeConstructor;
    enum4: DataTypeFunctionConstructor;
    map4: DataTypeFunctionConstructor;
    buffer: DataTypeConstructor;
    buffer8: DataTypeConstructor;
    buffer16: DataTypeConstructor;
    Array0: DataTypeFunctionConstructor;
    Array8: DataTypeFunctionConstructor;
    FixedString: DataTypeFunctionConstructor;
  };
  export const DataType: DataTypeInterface;
  export function Struct<StructType>(
    name: string,
    objectDefinition: GenericMap<StructType>
  ): StructInstance<StructType>;
}

/*
How to use @athombv/data-types in TypeScript:

// Create a type that represents the Struct data
type ZdoEndDeviceAnnounceIndication = {
  srcAddr: number;
  IEEEAddr: string;
};

// Create a Struct instance with generic type ZdoEndDeviceAnnounceIndication
const ZdoEndDeviceAnnounceIndicationStruct =
  Struct<ZdoEndDeviceAnnounceIndication>("ZdoEndDeviceAnnounceIndication", {
    srcAddr: DataTypes.uint16,
    IEEEAddr: DataTypes.EUI64,
  });

// Create ZdoEndDeviceAnnounceIndication object
const ZdoEndDeviceAnnounceObject = ZdoEndDeviceAnnounceIndicationStruct.fromBuffer(
  Buffer.from([0, 1, 2, 3])
);

ZdoEndDeviceAnnounceObject.srcAddr.trim(); // This errors, srcAddr is not a string

// Create Buffer instance from ZdoEndDeviceAnnounceObject
const ZdoEndDeviceAnnounceBuffer = ZdoEndDeviceAnnounceIndicationStruct.toBuffer({ srcAddr: 1, IEEAddr: 'abc' }); // This errors due to typo in IEEEAddr name

Known limitations:
- Structs in Structs are considered a no-go by these definitions.
- DataTypes have no related JS type, so a few unknowns are used.
*/
