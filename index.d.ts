declare namespace dotProp {

    /**
     * Gets the value of an object property.
     *
     * @param obj Object
     * @param propertyPath Property path
     * @param defaultValue Default value
     */
    function get( obj: object, propertyPath: string, defaultValue: any ): any;

    /**
     * Sets the value of an object property.
     *
     * @param obj Object
     * @param propertyPath Property path
     * @param defaultValue Default value
     * @returns A reference to the given object
     */
    function set( obj: object, propertyPath: string, defaultValue: any ): object;

    // /**
    //  * Sets the value of an object property.
    //  *
    //  * @param obj Object
    //  * @param propertyPath Property path
    //  * @param defaultValue Default Value
    //  */
    // function delete( obj: object, propertyPath: string ): void;

    /**
     * Verifies whether the given object property exists.
     *
     * @param obj Object
     * @param propertyPath Property path
     * @returns True if exists, false otherwise
     */
    function has( obj: object, propertyPath: string ): boolean;

}

export = dotProp;