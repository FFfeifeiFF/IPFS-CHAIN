package template

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

type FileTypeStats struct {
	FileType string `json:"fileType"`
	Count    int    `json:"count"`
}

func GetFileStatsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Query to get file type statistics
		query := `
			SELECT 
				CASE 
					WHEN filetype IS NULL OR filetype = '' THEN 'Unknown'
					ELSE filetype
				END as filetype,
				COUNT(*) as count
			FROM message
			GROUP BY filetype
			ORDER BY count DESC
		`

		rows, err := db.Query(query)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file statistics"})
			return
		}
		defer rows.Close()

		var stats []FileTypeStats
		for rows.Next() {
			var stat FileTypeStats
			if err := rows.Scan(&stat.FileType, &stat.Count); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process file statistics"})
				return
			}
			stats = append(stats, stat)
		}

		c.JSON(http.StatusOK, gin.H{"stats": stats})
	}
} 