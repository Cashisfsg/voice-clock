import { useState, useRef, useEffect } from "react";
import * as d3 from "d3";

import "./clock.css";

const rangeMapping = {
    "1-24": "nach",
    "25-29": "vor halb",
    "31-35": "nach halb",
    "36-59": "vor",
};

function getValueFromRange(value: number) {
    const rangeKey = Object.keys(rangeMapping).find((key) => {
        const [min, max] = key.split("-").map(Number);
        return value >= min && value <= max;
    });

    return rangeMapping[rangeKey as keyof typeof rangeMapping];
}

export const Clock = () => {
    const [voices, setVoices] = useState<Array<SpeechSynthesisVoice>>();
    const [language, setLanguage] = useState<string>("en-US");

    const containerRef = useRef<HTMLDivElement>(null);
    const activeVoice = useRef<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        // Define clock configuration parameters
        const clockRadius = 200,
            margin = 50,
            width = (clockRadius + margin) * 2,
            height = (clockRadius + margin) * 2,
            hourHandLength = (2 * clockRadius) / 3,
            minuteHandLength = clockRadius,
            secondHandLength = clockRadius - 12,
            secondHandBalance = 30,
            secondTickStart = clockRadius,
            secondTickLength = -10,
            hourTickStart = clockRadius,
            hourTickLength = -18,
            secondLabelRadius = clockRadius - 32,
            secondLabelYOffset = 5,
            hourLabelRadius = clockRadius + 16,
            hourLabelYOffset = 7,
            radians = Math.PI / 180;

        // Create linear scales for clock rotation
        const twelve = d3.scaleLinear().range([0, 360]).domain([0, 12]);
        const sixty = d3.scaleLinear().range([0, 360]).domain([0, 60]);

        // Define hand data with initial values
        const handData = [
            { type: "hour", value: 0, length: -hourHandLength, scale: twelve },
            {
                type: "minute",
                value: 0,
                length: -minuteHandLength,
                scale: sixty,
            },
            {
                type: "second",
                value: 0,
                length: -secondHandLength,
                scale: sixty,
                balance: secondHandBalance,
            },
        ];

        // Create an SVG element inside the container
        const svg = d3
            .select(containerRef.current)
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("max-width", "500px")
            .attr("id", "clock")
            .attr("width", width)
            .attr("height", height)
            .attr("stroke", "black");

        // Draw the clock face
        const face = svg
            .append("g")
            .attr("id", "clock-face")
            .attr("transform", `translate(${width / 2}, ${height / 2})`);

        // Draw second ticks
        face.selectAll(".second-tick")
            .data(d3.range(0, 60))
            .enter()
            .append("line")
            .attr("class", "second-tick")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", secondTickStart)
            .attr("y2", secondTickStart + secondTickLength)
            .attr("transform", (d) => `rotate(${sixty(d)})`)
            .attr("stroke-width", 3);

        // Draw second labels
        face.selectAll(".second-label")
            .data(d3.range(5, 61, 5))
            .enter()
            .append("text")
            .attr("class", "second-label")
            .attr("text-anchor", "middle")
            .attr("x", (d) => secondLabelRadius * Math.sin(sixty(d) * radians))
            .attr(
                "y",
                (d) =>
                    -secondLabelRadius * Math.cos(sixty(d) * radians) +
                    secondLabelYOffset
            )
            .text((d) => d);

        // Draw hour ticks
        face.selectAll(".hour-tick")
            .data(d3.range(0, 12))
            .enter()
            .append("line")
            .attr("class", "hour-tick")
            .attr("x1", 0)
            .attr("x2", 0)
            .attr("y1", hourTickStart)
            .attr("y2", hourTickStart + hourTickLength)
            .attr("transform", (d) => `rotate(${twelve(d)})`)
            .attr("stroke-width", 8);

        // Draw hour labels
        face.selectAll(".hour-label")
            .data(d3.range(3, 13, 3))
            .enter()
            .append("text")
            .attr("class", "hour-label")
            .attr("text-anchor", "middle")
            .attr("x", (d) => hourLabelRadius * Math.sin(twelve(d) * radians))
            .attr(
                "y",
                (d) =>
                    -hourLabelRadius * Math.cos(twelve(d) * radians) +
                    hourLabelYOffset
            )
            .text((d) => d);

        // Create a group for clock hands
        const hands = face.append("g").attr("id", "clock-hands");
        hands
            .selectAll("line")
            .data(handData)
            .enter()
            .append("line")
            .attr("class", (d) => d.type + "-hand")
            .attr("x1", 0)
            .attr("y1", (d) => d.balance || 0)
            .attr("x2", 0)
            .attr("y2", (d) => d.length)
            .attr("transform", (d) => `rotate(${d.scale(d.value)})`);

        // Add a cover circle for clock hands
        face.append("g")
            .attr("id", "face-overlay")
            .append("circle")
            .attr("class", "hands-cover")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", clockRadius / 20);

        // Function to update hand data from current time
        const updateData = () => {
            const now = new Date();
            handData[0].value = (now.getHours() % 12) + now.getMinutes() / 60;
            handData[1].value = now.getMinutes();
            handData[2].value = now.getSeconds();
        };

        // Function to move clock hands with transition
        const moveHands = () => {
            d3.select("#clock-hands")
                .selectAll("line")
                .data(handData)
                .transition()
                .ease(d3.easeElastic.period(0.5))
                .attr("transform", (d) => `rotate(${d.scale(d.value)})`);
        };

        // Initial update and animation interval
        updateData();
        moveHands();

        const interval = setInterval(() => {
            updateData();
            moveHands();
        }, 1000);

        // Cleanup function to remove interval and svg on component unmount
        return () => {
            clearInterval(interval);
            d3.select(containerRef.current).select("svg").remove();
        };
    }, []);

    useEffect(() => {
        const voices = window.speechSynthesis.getVoices();

        if (Array.isArray(voices) && voices.length > 0) {
            setVoices(voices);
            return;
        }

        if ("onvoiceschanged" in window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = function () {
                const voices = window.speechSynthesis.getVoices();
                setVoices(voices);
            };
        }
    }, []);

    const speak = (text: string | undefined = "Say something") => {
        const utterance = new SpeechSynthesisUtterance(text);

        if (activeVoice.current) {
            utterance.voice = activeVoice.current;
        }

        window.speechSynthesis.speak(utterance);
    };

    const onClickHandler: React.MouseEventHandler<HTMLButtonElement> = () => {
        const now = new Date();
        const hours = Math.round(
            (now.getHours() % 12) + (now.getMinutes() - 5) / 60
        );
        const minutes =
            now.getMinutes() > 30 ? 60 - now.getMinutes() : now.getMinutes();

        const utterance = `Es ist ${minutes} ${getValueFromRange(
            minutes
        )} ${hours}`;
        console.log(utterance);

        speak(utterance);
    };

    return (
        <>
            <div ref={containerRef} />
            <select
                onChange={(event) => {
                    // setLanguage(event.currentTarget.value);
                    const voice = voices?.find(
                        (voice) => voice.name === event.currentTarget.value
                    );
                    if (!voice) return;
                    activeVoice.current = voice;
                    setLanguage(voice?.lang);
                }}
            >
                {voices?.map(({ name }) => (
                    <option key={name} value={name}>
                        {name}
                    </option>
                ))}
            </select>
            <p>Language: {language}</p>
            <button onClick={onClickHandler}>Speak</button>
        </>
    );
};
