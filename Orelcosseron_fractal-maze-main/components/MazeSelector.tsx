"use client"

import { useState, useEffect, useRef, ChangeEvent } from 'react'

export default function MazeSelector({ onChange }: { onChange: (name: string) => void }) {
    const [mazeList, setMazeList] = useState([])

    useEffect(() => {
        setMazeList(require('../src/list.json').mazes)
    }, [])

    useEffect(() => {
        if (mazeList.length > 0) {
            onChange(mazeList[0])
        }
    }, [mazeList])

    const selectRef = useRef<HTMLSelectElement>(null);

    function handleFocus(e: ChangeEvent<HTMLSelectElement>) {
        onChange(e.target.value)
        selectRef.current!.blur();
    }

    return (
        <section>
            <select ref={selectRef} name="level_select" id="level_select" onChange={handleFocus}>
                {mazeList.map((level) => (
                    <option key={level} value={level}>{level}</option>
                ))}
            </select>
        </section>
    )
}