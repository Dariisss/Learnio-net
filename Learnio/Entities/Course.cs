using Microsoft.VisualBasic;
using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace Learnio.Entities
{
    public class Course
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string JoinCode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsArchived { get; set; } = false;

        // Связь с учителем
        public string TeacherId { get; set; }
        [ForeignKey("TeacherId")]
        public AppUser Teacher { get; set; }
    }
}
