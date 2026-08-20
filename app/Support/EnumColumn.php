<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Convert VARCHAR/string columns to native MySQL ENUM for domain statuses.
 * SQLite (tests) keeps string columns — PHP backed enums still cast/validate.
 */
class EnumColumn
{
    /**
     * @param  list<string>  $values
     */
    public static function modify(
        string $table,
        string $column,
        array $values,
        bool $nullable = false,
        ?string $default = null
    ): void {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();
        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            return;
        }

        if ($values === []) {
            throw new \InvalidArgumentException("Enum values required for {$table}.{$column}");
        }

        $list = implode(', ', array_map(
            static fn (string $v) => "'".str_replace("'", "''", $v)."'",
            $values
        ));

        $nullSql = $nullable ? 'NULL' : 'NOT NULL';

        if ($nullable && $default === null) {
            $defaultSql = ' DEFAULT NULL';
        } elseif ($default !== null) {
            $defaultSql = " DEFAULT '".str_replace("'", "''", $default)."'";
        } else {
            $defaultSql = '';
        }

        DB::statement(
            "ALTER TABLE `{$table}` MODIFY `{$column}` ENUM({$list}) {$nullSql}{$defaultSql}"
        );
    }
}
