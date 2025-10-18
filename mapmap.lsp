(defun c:MAPMAP (/ job-num url temp-file cmd map-url tick-start)
  
  ;; Get job number from user
  (setq job-num (getstring "\nEnter Job Number for Map: "))
  
  (if job-num
    (progn
      (princ "\nFetching vicinity map...")
      
      ;; Use curl to get map URL from SurveyDisco API
      (setq url (strcat "https://surveydisco-ai-222526998280.us-central1.run.app/api/projects/map/" job-num))
      (setq temp-file (strcat (getenv "TEMP") "\\mapurl_response.txt"))
      
      ;; Build curl command
      (setq cmd (strcat "curl -s -k --connect-timeout 30 --max-time 60 \"" url "\" -o \"" temp-file "\""))
      
      ;; Execute curl command synchronously
      (command "shell" cmd)
      
      ;; Wait for file to be created
      (setq tick-start (getvar "MILLISECS"))
      (while (and (not (findfile temp-file)) 
                  (< (- (getvar "MILLISECS") tick-start) 30000)) ; 30 second timeout
        (command "delay" 100) ; 100ms delay
      )
      
      ;; Read map URL from file
      (if (findfile temp-file)
        (progn
          (setq map-url (read-file-contents temp-file))
          ;; Clean up temp file
          (vl-file-delete temp-file)
          
          (if (and map-url (not (vl-string-search "ERROR" map-url)) (not (vl-string-search "JOB_NOT_FOUND" map-url)))
            (progn
              (princ "\nMap URL retrieved successfully!")
              (princ (strcat "\nMap URL: " map-url))
              
              ;; Download the actual map image
              (setq map-file (strcat (getenv "TEMP") "\\vicinity_map_" job-num ".png"))
              (setq download-cmd (strcat "curl -s -k \"" map-url "\" -o \"" map-file "\""))
              
              (princ "\nDownloading map image...")
              (command "shell" download-cmd)
              
              ;; Wait for download
              (setq tick-start (getvar "MILLISECS"))
              (while (and (not (findfile map-file)) 
                          (< (- (getvar "MILLISECS") tick-start) 60000)) ; 60 second timeout
                (command "delay" 500) ; 500ms delay
              )
              
              (if (findfile map-file)
                (progn
                  (princ (strcat "\nMap downloaded: " map-file))
                  (princ "\nUse IMAGEATTACH command to insert the map into your drawing.")
                  (princ (strcat "\nFile location: " map-file))
                )
                (princ "\nFailed to download map image.")
              )
            )
            (progn
              (princ (strcat "\nError: " (if map-url map-url "Failed to get map URL")))
            )
          )
        )
        (progn
          (princ "\nError: Failed to fetch map URL from SurveyDisco API")
        )
      )
    )
    (princ "\nNo job number entered.")
  )
  (princ)
)

;; Helper function to read file contents
(defun read-file-contents (filename / file-handle content line)
  (setq content "")
  (if (setq file-handle (open filename "r"))
    (progn
      (while (setq line (read-line file-handle))
        (setq content (strcat content line))
      )
      (close file-handle)
      content
    )
    nil
  )
)