/**
 * Manager of arrays for storing values for a set of attributes.
 * Maintains a fixed (maximum) underlying buffer for memory efficiency based on
 * the initially passed map of attribute names to item sizes.
 *
 * The main purpose of the class is to be able to easily (and efficiently) manage
 * the typed arrays required for vertex attributes.
 *
 * All attribute arrays are handled as Float32Array views.
 */
export default class AttributeArrayManager {
  private numVertices: number;
  private sharedBuffer: ArrayBuffer;
  private arrays: Map<string, Float32Array>;
  private starts: Map<string, number>;
  private curEnds: Map<string, number>;
  private lengths: Map<string, number>;

  constructor(numVertices: number, attrNamesToItemSizes: Map<string, number>) {
    this.numVertices = numVertices;

    this.lengths = new Map(
      [...attrNamesToItemSizes.entries()].map(([attrName, itemSize]) => [
        attrName,
        numVertices * itemSize,
      ]),
    );
    this.starts = new Map(
      [...this.lengths.entries()].reduce(
        (prev, [attrName, length]) => ({
          starts: prev.starts.concat([[attrName, prev.last]]),
          last: prev.last + length,
        }),
        { starts: [], last: 0 },
      ).starts,
    );
    this.sharedBuffer = new ArrayBuffer(
      [...this.lengths.values()].reduce(
        (prev, length) => prev + length * Float32Array.BYTES_PER_ELEMENT,
        0,
      ),
    );
    this.arrays = new Map(
      [...this.lengths.entries()].map(([attrName, length]) => [
        attrName,
        new Float32Array(
          this.sharedBuffer,
          this.starts.get(attrName) * Float32Array.BYTES_PER_ELEMENT,
          length,
        ),
      ]),
    );
    this.curEnds = new Map(
      [...attrNamesToItemSizes.keys()].map((attrName) => [attrName, 0]),
    );
  }

  get = (attribute: string) => {
    if (!this.arrays.has(attribute)) {
      throw new Error(`Attribute '${attribute}' does not exist in manager.`);
    }
    return this.arrays.get(attribute);
  };

  getLength = (attribute: string) => {
    this.get(attribute);
    return this.lengths.get(attribute);
  };

  /**
   * Pushes values to the "end" of an attribute array. The "ends" of the arrays are
   * maintained by the manager and are updated based on calls to this method.
   *
   * Note that it is still possible to directly set values at arbitrary indices, but
   * this will not update the end values.
   */
  push = (attribute: string, ...values: number[]) => {
    this.get(attribute);
    if (
      values.length + this.curEnds.get(attribute) >
      this.lengths.get(attribute)
    ) {
      throw new Error(
        `Attempting to add ${
          values.length
        } values to buffer of '${attribute}' when currently at length ${this.curEnds.get(
          attribute,
        )}`,
      );
    }
    values.forEach((value) => {
      this.arrays.get(attribute)[this.curEnds.get(attribute)] = value;
      this.curEnds.set(attribute, this.curEnds.get(attribute) + 1);
    });
  };

  getOffset = (attribute: string) => this.curEnds.get(attribute);

  /**
   * Sets the offset at which to start tracking push operations.
   *
   * See `.push()` for related info.
   */
  setOffset = (
    attribute: string,
    offset: number,
    fromCurrent: boolean = false,
  ) => {
    if (!fromCurrent) {
      this.curEnds.set(attribute, offset);
    } else {
      this.curEnds.set(attribute, this.curEnds.get(attribute) + offset);
    }
    return this.curEnds.get(attribute);
  };

  /**
   * Resets the attribute array by zeroing all values and moving the push checkpoint
   * to the start of the array.
   */
  reset = (attribute: string) => {
    this.arrays.get(attribute).fill(0);
    this.curEnds.set(attribute, 0);
  };

  resetAll = () => {
    [...this.arrays.keys()].forEach((attribute) => {
      this.reset(attribute);
    });
  };
}
