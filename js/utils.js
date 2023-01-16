const errorBlock = document.getElementById("errorBlock")
const errorText = document.getElementById("errorText")
const whisperBlock = document.getElementById("whisperBlock")
const whisperText = document.getElementById("whisperText")
const pointEBlock = document.getElementById("pointEBlock")
const recordButton = document.getElementById("recordButton")
const downloadButton = document.getElementById("downloadButton")

const maxSeconds = 3
let currentSeconds = maxSeconds


async function queryWhisper(file) {
    console.log("query Whisper")
    const response = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-large-v2",
        {
            headers: { Authorization: "Bearer INSERT HUGGINGFACE TOKEN HERE" },
            method: "POST",
            body: file,
            wait_for_model: true,
        }
    )
    const result = await response.json()
    return result
}

async function queryPointE(prompt) {
    console.log("query Point-E")
    load = JSON.stringify({ data: [prompt] })
    const response = await fetch(
        "https://openai-point-e.hf.space/run/predict",
        {
            headers: { "Content-Type": "application/json" },
            method: "POST",
            body: load,
        }
    )
    const result = await response.json()
    return result
}

function recordAudio() {

    errorBlock.classList.add("d-none")
    whisperBlock.classList.add("d-none")
    pointEBlock.classList.add("d-none")
    recordButton.disabled = true
    recordButton.innerHTML = "Recording... (" + currentSeconds + "s remaining)"

    let whisperError = false
    let prompt = ""

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorder.start()

            const audioChunks = []
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data)
            })
            mediaRecorder.addEventListener("stop", (e) => {
                const audioBlob = new Blob(audioChunks, {
                    'type': 'audio/mp3'
                })
                // const audioUrl = URL.createObjectURL(audioBlob)
                // const audio = new Audio(audioUrl)
                // audio.play()
                queryWhisper(audioBlob).then(
                    function (response) {
                        // console.log(response)
                        if (response.error) {
                            whisperError = true

                            errorBlock.classList.remove("d-none")
                            errorText.innerHTML = response.error
                            recordButton.disabled = false
                            recordButton.innerHTML = "Record Audio"
                        }
                        if (response.text) {
                            prompt = response.text

                            whisperBlock.classList.remove("d-none")
                            whisperText.innerHTML = prompt
                        }
                    }
                ).then(
                    function () {
                        if (!whisperError) {
                            recordButton.innerHTML = "Infering point cloud..."
                            queryPointE(prompt).then((response) => {
                                pointCloud = JSON.parse(response.data[0].plot)
                                Plotly.newPlot('pointEData', pointCloud.data, pointCloud.layout)
                                downloadButton.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(pointCloud)))
                                console.log(response.duration.toFixed(2) + "s / " + response.average_duration.toFixed(2) + "s")
                                pointEBlock.classList.remove("d-none")
                                recordButton.disabled = false
                                recordButton.innerHTML = "Record Audio"
                            })
                        }
                    }
                )



            })

            setTimeout(tick, 1000, mediaRecorder)

        })

}

function downloadData() {
    console.log("downloadData")
    downloadButton.setAttribute('download', "pointCloud.json")
}


function tick(mediaRec) {
    currentSeconds -= 1
    if (currentSeconds <= 0) {
        mediaRec.stop()
        recordButton.innerHTML = "Infering text..."
        currentSeconds = maxSeconds
    } else {
        recordButton.innerHTML = "Recording... (" + currentSeconds + "s remaining)"
        setTimeout(tick, 1000, mediaRec)
    }
}